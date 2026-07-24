import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Seedcord } from '@src/Seedcord';

import { seedcordPath } from '../utils/source-path';
import { testConfig } from '../utils/test-config';
import { TestEnvironment } from '../utils/test-env';

import '../utils/mock-client';
import '../utils/mock-env';

interface PrivateEventDispatcher {
    eventMap: Map<string, unknown[]>;
    init(): Promise<void>;
    onHmr(event: unknown): Promise<void>;
    processEvent(eventName: string, args: unknown[]): Promise<void>;
    stopAccepting(): void;
    drain(timeoutMs: number): Promise<void>;
}

interface TestBot {
    events: PrivateEventDispatcher;
}

describe('EventDispatcher Integration', () => {
    let testEnv: TestEnvironment;
    let seedcord: Seedcord;

    beforeEach(async () => {
        // @ts-expect-error: Accessing private method for testing
        Seedcord.reset();
        testEnv = new TestEnvironment('events-test-');
        await testEnv.setup();
    });

    afterEach(async () => {
        await testEnv.teardown();
        vi.clearAllMocks();
    });

    it('should load event handlers from directory', async () => {
        const eventsDir = 'events';
        await testEnv.createFile(
            `${eventsDir}/Ready.ts`,
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['ready'])
            export class ReadyHandler extends EventHandler<Events.ClientReady> {
                public async execute() {
                    console.log('Ready!');
                }
            }
            `
        );

        const config = testConfig({ events: testEnv.resolvePath(eventsDir) });

        seedcord = new Seedcord(config);
        // justified: TestBot exposes the private events controller for assertion
        const testBot = seedcord.bot as unknown as TestBot;
        await testBot.events.init();

        const controller = testBot.events;
        expect(controller.eventMap.has('ready')).toBe(true);
        expect(controller.eventMap.get('ready')).toHaveLength(1);
    });

    it('a throwing any:event observer does not abort the dispatch', async () => {
        const eventsDir = 'events';
        await testEnv.createFile(
            `${eventsDir}/Ping.ts`,
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageCreate'])
            export class PingHandler extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    await Promise.resolve();
                }
            }
            `
        );

        const config = testConfig({ events: testEnv.resolvePath(eventsDir) });
        seedcord = new Seedcord(config);
        // justified: TestBot exposes the private events controller for assertion
        const testBot = seedcord.bot as unknown as TestBot;

        // capture the messageCreate handler attachListener registers on the client
        const onSpy = vi.spyOn(seedcord.bot.client, 'on');
        await testBot.events.init();

        seedcord.bot.on('any:event', () => {
            throw new Error('observer boom');
        });

        const fire = onSpy.mock.calls.find(([event]) => event === 'messageCreate')?.[1] as
            | ((...args: unknown[]) => void)
            | undefined;

        expect(fire).toBeDefined();
        expect(() => fire?.({ reply: vi.fn() })).not.toThrow();
    });

    it('threads the fired event name into the handler so match routes to the right arm', async () => {
        const eventsDir = 'events';
        await testEnv.createFile(
            `${eventsDir}/PingMulti.ts`,
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageCreate'], ['messageUpdate'])
            export class PingMulti extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
                public async execute() {
                    await this.match({
                        messageCreate: (message) => message.reply('created'),
                        messageUpdate: (_old, edited) => edited.reply('updated')
                    });
                }
            }
            `
        );

        const config = testConfig({ events: testEnv.resolvePath(eventsDir) });

        seedcord = new Seedcord(config);
        // justified: TestBot exposes the private events controller for assertion
        const testBot = seedcord.bot as unknown as TestBot;
        await testBot.events.init();

        const created = { reply: vi.fn() };
        await testBot.events.processEvent('messageCreate', [created]);
        expect(created.reply).toHaveBeenCalledWith('created');

        const edited = { reply: vi.fn() };
        await testBot.events.processEvent('messageUpdate', [{ reply: vi.fn() }, edited]);
        expect(edited.reply).toHaveBeenCalledWith('updated');
    });

    it('reports a thrown error from a handler through the boundary', async () => {
        const eventsDir = 'events';
        await testEnv.createFile(
            `${eventsDir}/Boom.ts`,
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['guildMemberAdd'])
            export class BoomHandler extends EventHandler<Events.GuildMemberAdd> {
                public async execute() {
                    await Promise.resolve();
                    throw new Error('event exploded');
                }
            }
            `
        );

        const config = testConfig({ events: testEnv.resolvePath(eventsDir) });

        seedcord = new Seedcord(config);
        const publish = vi.spyOn(seedcord.bus, 'publish');
        // justified: TestBot exposes the private events controller for assertion
        const testBot = seedcord.bot as unknown as TestBot;
        await testBot.events.init();

        await testBot.events.processEvent('guildMemberAdd', [{}]);

        expect(publish).toHaveBeenCalledWith('unknownException', expect.anything());
    });

    it('marks a once handler spent even when it rethrows a non-Error, so it does not re-fire', async () => {
        const eventsDir = 'events';
        await testEnv.createFile(
            `${eventsDir}/OnceBoom.ts`,
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['guildMemberAdd', { frequency: 'once' }])
            export class OnceBoom extends EventHandler<Events.GuildMemberAdd> {
                public async execute() {
                    await Promise.resolve();
                    throw 'raw string';
                }
            }
            `
        );

        const config = testConfig({ events: testEnv.resolvePath(eventsDir) });

        seedcord = new Seedcord(config);
        // justified: TestBot exposes the private events controller for assertion
        const testBot = seedcord.bot as unknown as TestBot;
        await testBot.events.init();

        // the non-Error rethrows to the root, but the once handler is now spent
        await expect(testBot.events.processEvent('guildMemberAdd', [{}])).rejects.toBe('raw string');
        // a second fire must not re-run it, so it resolves with no throw
        await expect(testBot.events.processEvent('guildMemberAdd', [{}])).resolves.toBeUndefined();
    });

    it('runs a once handler exactly once when the same event fires concurrently', async () => {
        const eventsDir = 'events';
        await testEnv.createFile(
            `${eventsDir}/OnceConcurrent.ts`,
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageCreate', { frequency: 'once' }])
            export class OnceConcurrent extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    await this.match({ messageCreate: (message) => message.reply('once') });
                }
            }
            `
        );

        const config = testConfig({ events: testEnv.resolvePath(eventsDir) });

        seedcord = new Seedcord(config);
        // justified: TestBot exposes the private events controller for assertion
        const testBot = seedcord.bot as unknown as TestBot;
        await testBot.events.init();

        // both fires run their once-filter snapshot before either marks spent, because
        // `await runMiddlewares` yields between the snapshot and the mark
        const message = { reply: vi.fn() };
        await Promise.all([
            testBot.events.processEvent('messageCreate', [message]),
            testBot.events.processEvent('messageCreate', [message])
        ]);

        expect(message.reply).toHaveBeenCalledTimes(1);
    });

    it('does not consume a once handler when middleware blocks the fire', async () => {
        const eventsDir = 'events';
        const middlewaresDir = 'event-mw';

        await testEnv.createFile(
            `${eventsDir}/OnceAfterBlock.ts`,
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageCreate', { frequency: 'once' }])
            export class OnceAfterBlock extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    await this.match({ messageCreate: (message) => message.reply('ran') });
                }
            }
            `
        );

        await testEnv.createFile(
            `${middlewaresDir}/BlockFirst.ts`,
            `
            import { Middleware, MiddlewareType, EventMiddleware, Silence } from '${seedcordPath}';

            let fires = 0;

            @Middleware(MiddlewareType.Event, 0)
            export class BlockFirst extends EventMiddleware {
                public async execute() {
                    fires++;
                    if (fires === 1) throw new Silence('block the first fire');
                }
            }
            `
        );

        const config = testConfig({
            events: testEnv.resolvePath(eventsDir),
            eventMiddlewares: testEnv.resolvePath(middlewaresDir)
        });

        seedcord = new Seedcord(config);
        // justified: TestBot exposes the private events controller for assertion
        const testBot = seedcord.bot as unknown as TestBot;
        await testBot.events.init();

        // a middleware block stops the whole event, so it must not spend the once budget
        const message = { reply: vi.fn() };
        await testBot.events.processEvent('messageCreate', [message]);
        expect(message.reply).not.toHaveBeenCalled();

        // the second fire passes middleware, so the once handler still runs
        await testBot.events.processEvent('messageCreate', [message]);
        expect(message.reply).toHaveBeenCalledTimes(1);
    });

    it('keeps a spent once handler spent after a failed reload rolls it back', async () => {
        const eventsDir = 'events';
        const filePath = await testEnv.createFile(
            `${eventsDir}/OnceRollback.ts`,
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageCreate', { frequency: 'once' }])
            export class OnceRollback extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    await this.match({ messageCreate: (message) => message.reply('once') });
                }
            }
            `
        );

        const config = testConfig({ events: testEnv.resolvePath(eventsDir) });

        seedcord = new Seedcord(config);
        // justified: TestBot exposes the private events controller for assertion
        const testBot = seedcord.bot as unknown as TestBot;
        await testBot.events.init();

        const message = { reply: vi.fn() };
        await testBot.events.processEvent('messageCreate', [message]);
        expect(message.reply).toHaveBeenCalledTimes(1);

        // a broken edit, the reload fails and rolls the handler back
        await testEnv.createFile(`${eventsDir}/OnceRollback.ts`, 'export const broken = {{{ not valid');
        await testBot.events.onHmr({ file: filePath, type: 'update' });

        // the rolled-back handler is the same spent ctor, so a second fire must not re-run it
        await testBot.events.processEvent('messageCreate', [message]);
        expect(message.reply).toHaveBeenCalledTimes(1);
    });

    it('should handle HMR updates for event handlers', async () => {
        const eventsDir = 'events';
        const filePath = await testEnv.createFile(
            `${eventsDir}/Message.ts`,
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageCreate'])
            export class MessageHandler extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    console.log('Message!');
                }
            }
            `
        );

        const config = testConfig({ events: testEnv.resolvePath(eventsDir) });

        seedcord = new Seedcord(config);
        // justified: TestBot exposes the private events controller for assertion
        const testBot = seedcord.bot as unknown as TestBot;
        await testBot.events.init();

        let controller = testBot.events;
        expect(controller.eventMap.get('messageCreate')).toHaveLength(1);

        await testEnv.createFile(
            `${eventsDir}/Message.ts`,
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageUpdate']) // Changed event
            export class MessageHandler extends EventHandler<Events.MessageUpdate> {
                public async execute() {
                    console.log('Message Updated!');
                }
            }
            `
        );

        await testBot.events.onHmr({
            file: filePath,
            type: 'update'
        });

        controller = testBot.events;

        expect(controller.eventMap.has('messageCreate')).toBe(false);
        expect(controller.eventMap.has('messageUpdate')).toBe(true);
    });

    it('runs a passing gate, then the handler executes', async () => {
        await testEnv.createFile(
            'events/Allowed.ts',
            `
            import { defineGate, Gated, EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            const Allow = defineGate('Allow', () => {});

            @Gated(Allow)
            @RegisterEvent(['messageCreate'])
            export class AllowedEvent extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    await this.match({ messageCreate: (message) => message.reply('ran') });
                }
            }
            `
        );

        const config = testConfig({ events: testEnv.resolvePath('events') });

        seedcord = new Seedcord(config);
        const testBot = seedcord.bot as unknown as TestBot;
        await testBot.events.init();

        const message = { reply: vi.fn() };
        await testBot.events.processEvent('messageCreate', [message]);

        expect(message.reply).toHaveBeenCalledWith('ran');
    });

    it('a refusing gate stops the handler before execute', async () => {
        await testEnv.createFile(
            'events/Refused.ts',
            `
            import { defineGate, Gated, Silence, EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            const Block = defineGate('Block', () => {
                throw new Silence('blocked');
            });

            @Gated(Block)
            @RegisterEvent(['messageCreate'])
            export class RefusedEvent extends EventHandler<Events.MessageCreate> {
                public async execute() {
                    await this.match({ messageCreate: (message) => message.reply('ran') });
                }
            }
            `
        );

        const config = testConfig({ events: testEnv.resolvePath('events') });

        seedcord = new Seedcord(config);
        const testBot = seedcord.bot as unknown as TestBot;
        await testBot.events.init();

        const message = { reply: vi.fn() };
        await testBot.events.processEvent('messageCreate', [message]);

        // the gate threw a Silence, so execute never ran and the message was not replied to
        expect(message.reply).not.toHaveBeenCalled();
    });

    describe('drain', () => {
        async function drainHarness(): Promise<{
            controller: PrivateEventDispatcher;
            fire: ((...args: unknown[]) => void) | undefined;
        }> {
            await testEnv.createFile(
                'events/Ping.ts',
                `
                import { EventHandler, RegisterEvent } from '${seedcordPath}';
                import { Events } from 'discord.js';

                @RegisterEvent(['messageCreate'])
                export class PingHandler extends EventHandler<Events.MessageCreate> {
                    public async execute() {
                        await Promise.resolve();
                    }
                }
                `
            );

            const config = testConfig({ events: testEnv.resolvePath('events') });
            seedcord = new Seedcord(config);
            // justified: reaches the private events dispatcher for the drain test
            const controller = (seedcord.bot as unknown as TestBot).events;

            const onSpy = vi.spyOn(seedcord.bot.client, 'on');
            await controller.init();

            const fire = onSpy.mock.calls.find(([event]) => event === 'messageCreate')?.[1] as
                | ((...args: unknown[]) => void)
                | undefined;
            expect(fire).toBeDefined();
            return { controller, fire };
        }

        it('stops dispatching new events after stopAccepting, and drain resolves', async () => {
            const { controller, fire } = await drainHarness();
            const processSpy = vi.spyOn(controller, 'processEvent').mockResolvedValue(undefined);

            fire?.({ reply: vi.fn() });
            expect(processSpy).toHaveBeenCalledTimes(1);

            controller.stopAccepting();
            fire?.({ reply: vi.fn() });
            // draining, so no new dispatch started
            expect(processSpy).toHaveBeenCalledTimes(1);

            await expect(controller.drain(50)).resolves.toBeUndefined();
        });

        it('drain waits for an in-flight event that settles inside the budget', async () => {
            const { controller, fire } = await drainHarness();

            let settled = false;
            vi.spyOn(controller, 'processEvent').mockImplementation(
                () =>
                    new Promise<void>((resolve) => {
                        setTimeout(() => {
                            settled = true;
                            resolve();
                        }, 20);
                    })
            );
            fire?.({ reply: vi.fn() });
            controller.stopAccepting();

            await controller.drain(1000);
            expect(settled).toBe(true);
        });

        it('drain returns through the timer when an event never settles', async () => {
            const { controller, fire } = await drainHarness();

            vi.spyOn(controller, 'processEvent').mockReturnValue(new Promise<void>(() => undefined));
            fire?.({ reply: vi.fn() });
            controller.stopAccepting();

            await expect(controller.drain(30)).resolves.toBeUndefined();
        });

        it('clears the drain timer when the in-flight set settles first', async () => {
            const { controller, fire } = await drainHarness();
            vi.spyOn(controller, 'processEvent').mockResolvedValue(undefined);
            fire?.({ reply: vi.fn() });
            controller.stopAccepting();

            vi.useFakeTimers();
            await controller.drain(5000);
            expect(vi.getTimerCount()).toBe(0);
            vi.useRealTimers();
        });
    });
});
