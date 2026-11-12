import { PublishDefault } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { GuildMember } from 'discord.js';
import { afterEach, beforeEach, describe, expect, vi } from 'vite-plus/test';

import { dispatcherOf } from '#tests/utils/dispatcherOf';
import { pluginWithMembers } from '#tests/utils/pluginWithMembers';
import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { it } from '#tests/utils/test-env';

import type { Seedcord } from '#src/Seedcord';
import type { DispatchOrigin } from '@seedcord/core';
import type { MockInstance } from 'vite-plus/test';

// a global is the only channel back to the test, since the fixture compiles into a temp dir
function fireCalls(): string[] {
    return (globalThis as { fireCalls?: string[] }).fireCalls ?? [];
}

type Boot = (
    handlers: string,
    middlewares?: string,
    attach?: (bot: Seedcord) => void
) => Promise<ReturnType<typeof dispatcherOf>>;

// a real GuildMember instance for deriveEventActor's instanceof check, carrying only what the gate context reads
function guildMemberPayload(): GuildMember {
    return Object.defineProperties(Object.create(GuildMember.prototype) as GuildMember, {
        guild: { value: { id: 'g1', preferredLocale: 'fr', members: { me: null } } },
        user: { value: { id: 'u1' } },
        roles: { value: { cache: new Map() } },
        permissions: { value: { bitfield: 0n } }
    });
}

const withBoot = it.extend<{ boot: Boot }>({
    boot: async ({ testEnv, seedcordWith }, use) => {
        await use(async (handlers, middlewares, attach) => {
            await testEnv.createFile('events/Handler.ts', handlers);
            if (middlewares) await testEnv.createFile('event-mw/Mw.ts', middlewares);

            const config = testConfig({
                events: testEnv.resolvePath('events'),
                ...(middlewares && { eventMiddlewares: testEnv.resolvePath('event-mw') })
            });

            const bot = seedcordWith(config);
            attach?.(bot);
            const events = dispatcherOf(bot);
            await events.init();
            return events;
        });
    }
});

describe('the per-dispatch event context', () => {
    beforeEach(() => {
        (globalThis as { fireCalls?: string[] }).fireCalls = [];
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    withBoot('shares one context between the chain and every handler in a dispatch', async ({ boot }) => {
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

    withBoot('gives plugin members to the middleware, the gate, and the handler of an event', async ({ boot }) => {
        const tag = vi.fn(
            (origin: DispatchOrigin) =>
                `${String(origin.userId)}:${String(origin.userLocale)}:${String(origin.guildLocale)}`
        );
        const events = await boot(
            `
            import { defineGate, Gated, EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            const ReadsTag = defineGate('ReadsTag', (ctx) => {
                globalThis.fireCalls.push('gate:' + ctx.tag);
            });

            @Gated(ReadsTag)
            @RegisterEvent(['guildMemberAdd'])
            export class Greets extends EventHandler<Events.GuildMemberAdd> {
                public async execute() {
                    globalThis.fireCalls.push('handler:' + this.tag);
                }
            }
            `,
            `
            import { EventMiddleware, RegisterEventMiddleware } from '${seedcordPath}';

            @RegisterEventMiddleware()
            export class Reads extends EventMiddleware {
                public async execute() {
                    globalThis.fireCalls.push('middleware:' + this.tag);
                }
            }
            `,
            (bot) => bot.attach('tagging', pluginWithMembers({ tag }))
        );

        await events.processEvent('guildMemberAdd', [guildMemberPayload()]);

        expect(fireCalls()).toEqual(['middleware:u1:null:fr', 'gate:u1:null:fr', 'handler:u1:null:fr']);
        expect(tag).toHaveBeenCalledOnce();
    });

    withBoot('reports a member that throws and skips the middleware and handlers', async ({ boot }) => {
        let publish: MockInstance | undefined;
        const events = await boot(
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['guildMemberAdd'])
            export class NeverRuns extends EventHandler<Events.GuildMemberAdd> {
                public async execute() {
                    globalThis.fireCalls.push('handler');
                }
            }
            `,
            `
            import { EventMiddleware, RegisterEventMiddleware } from '${seedcordPath}';

            @RegisterEventMiddleware()
            export class NeverRuns extends EventMiddleware {
                public async execute() {
                    globalThis.fireCalls.push('middleware');
                }
            }
            `,
            (bot) => {
                publish = vi.spyOn(bot.bus, PublishDefault);
                bot.attach(
                    'tagging',
                    pluginWithMembers({
                        tag: () => {
                            throw new Error('boom');
                        }
                    })
                );
            }
        );

        await expect(events.processEvent('guildMemberAdd', [guildMemberPayload()])).resolves.toBeUndefined();

        expect(fireCalls()).toEqual([]);
        const reported = publish?.mock.calls.find(([event]) => event === 'unknownException');
        expect(reported?.[1]).toMatchObject({ error: { code: SeedcordErrorCode.CorePluginMemberThrew } });
    });

    withBoot('fails to load an event handler that has a method with a member name', async ({ boot }) => {
        const loading = boot(
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['guildMemberAdd'])
            export class Clashes extends EventHandler<Events.GuildMemberAdd> {
                public tag() {}
                public async execute() {}
            }
            `,
            undefined,
            (bot) => bot.attach('tagging', pluginWithMembers({ tag: () => 'tag' }))
        );

        await expect(loading).rejects.toMatchObject({ code: SeedcordErrorCode.CoreDuplicateName });
    });

    withBoot('skips an event handler whose field replaces a member', async ({ boot }) => {
        let publish: MockInstance | undefined;
        const events = await boot(
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['guildMemberAdd'])
            export class Shadows extends EventHandler<Events.GuildMemberAdd> {
                public readonly tag = 'own';
                public async execute() {
                    globalThis.fireCalls.push('handler');
                }
            }
            `,
            undefined,
            (bot) => {
                publish = vi.spyOn(bot.bus, PublishDefault);
                bot.attach('tagging', pluginWithMembers({ tag: () => 'tag' }));
            }
        );

        await events.processEvent('guildMemberAdd', [guildMemberPayload()]);

        expect(fireCalls()).toEqual([]);
        const reported = publish?.mock.calls.find(([event]) => event === 'unknownException');
        expect(reported?.[1]).toMatchObject({ error: { code: SeedcordErrorCode.CoreDuplicateName } });
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

    withBoot('leaves the handler list empty when the chain stops the dispatch', async ({ boot }) => {
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
                    throw new Silence('stop the dispatch');
                }
            }
            `
        );

        await events.processEvent('messageCreate', [{ reply: vi.fn() }]);

        expect(fireCalls()).toEqual(['refused:0']);
    });

    withBoot('lists a failing handler and still runs the rest', async ({ boot }) => {
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
                    throw new Silence('stop the dispatch');
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

    withBoot('stops the dispatch when a middleware constructor throws', async ({ boot }) => {
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
