import { afterEach, beforeEach, describe, expect, vi } from 'vitest';

import { eventsOf } from '#bot/Bot';
import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { it } from '#tests/utils/test-env';

import type { Seedcord } from '#src/Seedcord';

import '#tests/utils/mock-env';

interface PrivateEventDispatcher {
    init(): Promise<void>;
    processEvent(eventName: string, args: unknown[]): Promise<void>;
}

// justified: processEvent is private on the dispatcher
function dispatcherOf(instance: Seedcord): PrivateEventDispatcher {
    return eventsOf(instance.bot) as unknown as PrivateEventDispatcher;
}

// a global is the only channel back to the test, since the fixture compiles into a temp dir
function fireCalls(): string[] {
    return (globalThis as { fireCalls?: string[] }).fireCalls ?? [];
}

type Boot = (handlers: string, middlewares?: string) => Promise<PrivateEventDispatcher>;

const withBoot = it.extend<{ boot: Boot }>({
    boot: async ({ testEnv, seedcordWith }, use) => {
        await use(async (handlers, middlewares) => {
            await testEnv.createFile('events/Handler.ts', handlers);
            if (middlewares) await testEnv.createFile('event-mw/Mw.ts', middlewares);

            const config = testConfig({
                events: testEnv.resolvePath('events'),
                ...(middlewares && { eventMiddlewares: testEnv.resolvePath('event-mw') })
            });

            const events = dispatcherOf(seedcordWith(config));
            await events.init();
            return events;
        });
    }
});

describe('the per-fire event context', () => {
    beforeEach(() => {
        (globalThis as { fireCalls?: string[] }).fireCalls = [];
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    withBoot('shares one context between the chain and every handler of a fire', async ({ boot }) => {
        const events = await boot(
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageCreate'])
            export class Reader extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    globalThis.fireCalls.push('handler:' + this.dispatch.require('tag'));
                    globalThis.fireCalls.push('routeId:' + this.dispatch.routeId);
                }
            }
            `,
            `
            import { EventMiddleware, RegisterEventMiddleware } from '${seedcordPath}';

            @RegisterEventMiddleware()
            export class Tagger extends EventMiddleware {
                public async execute() {
                    this.dispatch.set('tag', 'from-middleware');
                }
            }
            `
        );

        await events.processEvent('messageCreate', [{ reply: vi.fn() }]);

        expect(fireCalls()).toEqual(['handler:from-middleware', 'routeId:event:messageCreate']);
    });

    withBoot('hands a gate the same context the chain wrote to', async ({ boot }) => {
        const events = await boot(
            `
            import { defineGate, Gated, EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            const ReadsDispatch = defineGate('ReadsDispatch', (ctx) => {
                globalThis.fireCalls.push('gate:' + ctx.dispatch.get('tag'));
            });

            @Gated(ReadsDispatch)
            @RegisterEvent(['messageCreate'])
            export class Guarded extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    globalThis.fireCalls.push('handler');
                }
            }
            `,
            `
            import { EventMiddleware, RegisterEventMiddleware } from '${seedcordPath}';

            @RegisterEventMiddleware()
            export class Tagger extends EventMiddleware {
                public async execute() {
                    this.dispatch.set('tag', 'from-middleware');
                }
            }
            `
        );

        await events.processEvent('messageCreate', [{ reply: vi.fn() }]);

        expect(fireCalls()).toEqual(['gate:from-middleware', 'handler']);
    });

    // a global is the only channel back to the test, since the fixture compiles into a temp dir
    const AFTER_PAIR = `
        import { EventMiddleware, RegisterEventMiddleware } from '${seedcordPath}';

        @RegisterEventMiddleware({ priority: 1 })
        export class First extends EventMiddleware {
            public async execute() {}
            public override async after(result) {
                globalThis.fireCalls.push('First:' + JSON.stringify(result));
            }
        }

        @RegisterEventMiddleware({ priority: 2 })
        export class Second extends EventMiddleware {
            public async execute() {}
            public override async after(result) {
                globalThis.fireCalls.push('Second:' + result.outcome);
            }
        }
    `;

    withBoot('hands after() one entry per handler that ran, newest middleware first', async ({ boot }) => {
        const events = await boot(
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageCreate'])
            export class Greeter extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    globalThis.fireCalls.push('handler');
                }
            }
            `,
            AFTER_PAIR
        );

        await events.processEvent('messageCreate', [{ reply: vi.fn() }]);

        expect(fireCalls()).toEqual([
            'handler',
            'Second:handled',
            `First:${JSON.stringify({ outcome: 'handled', handlers: [{ handler: 'Greeter', outcome: 'handled' }] })}`
        ]);
    });

    withBoot('leaves the handler list empty when the chain stops the fire', async ({ boot }) => {
        const events = await boot(
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageCreate'])
            export class NeverRuns extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    globalThis.fireCalls.push('handler');
                }
            }
            `,
            `
            import { EventMiddleware, RegisterEventMiddleware, Silence } from '${seedcordPath}';

            @RegisterEventMiddleware({ priority: 1 })
            export class Watcher extends EventMiddleware {
                public async execute() {}
                public override async after(result) {
                    globalThis.fireCalls.push(result.outcome + ':' + result.handlers.length);
                }
            }

            @RegisterEventMiddleware({ priority: 2 })
            export class Stops extends EventMiddleware {
                public async execute() {
                    throw new Silence('stop the fire');
                }
            }
            `
        );

        await events.processEvent('messageCreate', [{ reply: vi.fn() }]);

        expect(fireCalls()).toEqual(['refused:0']);
    });

    withBoot('names a failing handler in the list and still runs the rest', async ({ boot }) => {
        const events = await boot(
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageCreate'])
            export class Boom extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    throw new Error('handler exploded');
                }
            }

            @RegisterEvent(['messageCreate'])
            export class Survivor extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    globalThis.fireCalls.push('survivor');
                }
            }
            `,
            `
            import { EventMiddleware, RegisterEventMiddleware } from '${seedcordPath}';

            @RegisterEventMiddleware()
            export class Watcher extends EventMiddleware {
                public async execute() {}
                public override async after(result) {
                    globalThis.fireCalls.push(result.handlers.map((h) => h.handler + ':' + h.outcome).join(','));
                }
            }
            `
        );

        await events.processEvent('messageCreate', [{ reply: vi.fn() }]);

        expect(fireCalls()).toEqual(['survivor', 'Boom:failed,Survivor:handled']);
    });

    withBoot('gives the middleware that threw its own after()', async ({ boot }) => {
        const events = await boot(
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageCreate'])
            export class NeverRuns extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    globalThis.fireCalls.push('handler');
                }
            }
            `,
            `
            import { EventMiddleware, RegisterEventMiddleware, Silence } from '${seedcordPath}';

            @RegisterEventMiddleware()
            export class Stops extends EventMiddleware {
                public async execute() {
                    throw new Silence('stop the fire');
                }
                public override async after(result) {
                    globalThis.fireCalls.push('Stops:' + result.outcome);
                }
            }
            `
        );

        await events.processEvent('messageCreate', [{ reply: vi.fn() }]);

        expect(fireCalls()).toEqual(['Stops:refused']);
    });

    withBoot('stops the fire when a middleware constructor throws', async ({ boot }) => {
        const events = await boot(
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageCreate'])
            export class Never extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    globalThis.fireCalls.push('handler');
                }
            }
            `,
            `
            import { EventMiddleware, RegisterEventMiddleware } from '${seedcordPath}';

            @RegisterEventMiddleware({ priority: 1 })
            export class Watcher extends EventMiddleware {
                public async execute() {}
                public override async after(result) {
                    globalThis.fireCalls.push('after:' + result.outcome);
                }
            }

            @RegisterEventMiddleware({ priority: 2 })
            export class Exploder extends EventMiddleware {
                constructor(...args) {
                    super(...args);
                    throw new Error('ctor exploded');
                }
                public async execute() {}
            }
            `
        );

        await expect(events.processEvent('messageCreate', [{ reply: vi.fn() }])).resolves.toBeUndefined();

        expect(fireCalls()).toEqual(['after:failed']);
    });
});
