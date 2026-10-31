import { PublishDefault } from '@seedcord/core/internal';
import { afterEach, describe, expect, vi } from 'vitest';

import { botLoggerOf } from '#bot/Bot';
import { Seedcord } from '#src/Seedcord';
import { dispatcherOf } from '#tests/utils/dispatcherOf';
import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { it } from '#tests/utils/test-env';

import type { SubscriptionData } from '@seedcord/core';

describe('EventDispatcher Integration', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should load event handlers from directory', async ({ testEnv }) => {
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

        await using seedcord = new Seedcord(config);
        const events = dispatcherOf(seedcord);
        await events.init();

        const controller = events;
        expect(controller.eventMap.has('ready')).toBe(true);
        expect(controller.eventMap.get('ready')).toHaveLength(1);
    });

    it('a throwing eventDispatching observer does not abort the dispatch', async ({ testEnv }) => {
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
        await using seedcord = new Seedcord(config);
        const events = dispatcherOf(seedcord);

        const onSpy = vi.spyOn(seedcord.bot.client, 'on');
        await events.init();
        events.inFlight.open();

        seedcord.bus.on('eventDispatching', () => {
            throw new Error('observer boom');
        });

        const fire = onSpy.mock.calls.find(([event]) => event === 'messageCreate')?.[1] as
            ((...args: unknown[]) => void) | undefined;

        expect(fire).toBeDefined();
        expect(() => fire?.({ reply: vi.fn() })).not.toThrow();
    });

    it('publishes eventDispatching with the current event name and its args', async ({ testEnv }) => {
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
        await using seedcord = new Seedcord(config);
        const events = dispatcherOf(seedcord);

        const onSpy = vi.spyOn(seedcord.bot.client, 'on');
        await events.init();
        events.inFlight.open();

        const seen: SubscriptionData<'eventDispatching'>[] = [];
        seedcord.bus.on('eventDispatching', (payload) => seen.push(payload));

        const fire = onSpy.mock.calls.find(([event]) => event === 'messageCreate')?.[1] as
            ((...args: unknown[]) => void) | undefined;
        const message = { id: 'm1', content: 'hi' };
        fire?.(message);

        expect(seen).toHaveLength(1);
        expect(seen[0]?.name).toBe('messageCreate');
        expect(seen[0]?.args[0]).toBe(message);
    });

    it('threads the current event name into the handler so match routes to the right arm', async ({ testEnv }) => {
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

        await using seedcord = new Seedcord(config);
        const events = dispatcherOf(seedcord);
        await events.init();

        const created = { reply: vi.fn() };
        await events.processEvent('messageCreate', [created]);
        expect(created.reply).toHaveBeenCalledWith('created');

        const edited = { reply: vi.fn() };
        await events.processEvent('messageUpdate', [{ reply: vi.fn() }, edited]);
        expect(edited.reply).toHaveBeenCalledWith('updated');
    });

    it('reports a thrown error from a handler through the boundary', async ({ testEnv }) => {
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

        await using seedcord = new Seedcord(config);
        const publish = vi.spyOn(seedcord.bus, PublishDefault);
        const events = dispatcherOf(seedcord);
        await events.init();

        await events.processEvent('guildMemberAdd', [{}]);

        expect(publish).toHaveBeenCalledWith('unknownException', expect.anything());
    });

    it('should handle HMR updates for event handlers', async ({ testEnv }) => {
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

        await using seedcord = new Seedcord(config);
        const events = dispatcherOf(seedcord);
        await events.init();

        let controller = events;
        expect(controller.eventMap.get('messageCreate')).toHaveLength(1);

        await testEnv.createFile(
            `${eventsDir}/Message.ts`,
            `
            import { EventHandler, RegisterEvent } from '${seedcordPath}';
            import { Events } from 'discord.js';

            @RegisterEvent(['messageUpdate'])
            export class MessageHandler extends EventHandler<Events.MessageUpdate> {
                public async execute() {
                    console.log('Message Updated!');
                }
            }
            `
        );

        await events.onHmr({
            file: filePath,
            type: 'update'
        });

        controller = events;

        expect(controller.eventMap.has('messageCreate')).toBe(false);
        expect(controller.eventMap.has('messageUpdate')).toBe(true);
    });

    it('runs a passing gate, then the handler executes', async ({ testEnv }) => {
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

        await using seedcord = new Seedcord(config);
        const events = dispatcherOf(seedcord);
        await events.init();

        const message = { reply: vi.fn() };
        await events.processEvent('messageCreate', [message]);

        expect(message.reply).toHaveBeenCalledWith('ran');
    });

    it('a refusing gate stops the handler before execute', async ({ testEnv }) => {
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

        await using seedcord = new Seedcord(config);
        const events = dispatcherOf(seedcord);
        await events.init();

        const message = { reply: vi.fn() };
        await events.processEvent('messageCreate', [message]);

        expect(message.reply).not.toHaveBeenCalled();
    });

    describe('client-attached dispatch', () => {
        interface ClientHarness {
            seedcord: Seedcord;
            controller: ReturnType<typeof dispatcherOf>;
            fire: ((...args: unknown[]) => void) | undefined;
        }

        const withClient = it.extend<{ client: ClientHarness }>({
            client: async ({ testEnv }, use) => {
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

                await using seedcord = new Seedcord(testConfig({ events: testEnv.resolvePath('events') }));
                const controller = dispatcherOf(seedcord);

                const onSpy = vi.spyOn(seedcord.bot.client, 'on');
                await controller.init();
                controller.inFlight.open();

                const fire = onSpy.mock.calls.find(([event]) => event === 'messageCreate')?.[1] as
                    ((...args: unknown[]) => void) | undefined;
                expect(fire).toBeDefined();
                await use({ seedcord, controller, fire });
            }
        });

        withClient('runs later unhandledEventError listeners after an earlier one throws', async ({ client }) => {
            const { seedcord, controller, fire } = client;
            vi.spyOn(controller, 'processEvent').mockRejectedValue(new Error('boom'));
            vi.spyOn(botLoggerOf(seedcord.bot), 'error').mockImplementation(() => undefined);

            let reached = false;
            seedcord.bus.on('unhandledEventError', () => {
                throw new Error('listener blew up');
            });
            seedcord.bus.on('unhandledEventError', () => {
                reached = true;
            });

            fire?.({ reply: vi.fn() });

            await vi.waitFor(() => {
                expect(reached).toBe(true);
            });
        });

        withClient(
            'wraps a non-Error rejection at the root, so the payload still carries an Error',
            async ({ client }) => {
                const { seedcord, controller, fire } = client;
                vi.spyOn(controller, 'processEvent').mockRejectedValue('a bare string');
                vi.spyOn(botLoggerOf(seedcord.bot), 'error').mockImplementation(() => undefined);

                const seen: SubscriptionData<'unhandledEventError'>[] = [];
                seedcord.bus.on('unhandledEventError', (payload) => seen.push(payload));

                fire?.({ reply: vi.fn() });

                await vi.waitFor(() => {
                    expect(seen).toHaveLength(1);
                });
                expect(seen[0]?.error.message).toBe('a bare string');
            }
        );

        withClient('stops dispatching new events after stopAccepting, and drain resolves', async ({ client }) => {
            const { controller, fire } = client;
            const processSpy = vi.spyOn(controller, 'processEvent').mockResolvedValue(undefined);

            fire?.({ reply: vi.fn() });
            expect(processSpy).toHaveBeenCalledTimes(1);

            controller.inFlight.close();
            fire?.({ reply: vi.fn() });
            expect(processSpy).toHaveBeenCalledTimes(1);

            await expect(controller.inFlight.drain(50)).resolves.toBeUndefined();
        });

        withClient('drain waits for an in-flight event that settles inside the budget', async ({ client }) => {
            const { controller, fire } = client;

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
            controller.inFlight.close();

            await controller.inFlight.drain(1000);
            expect(settled).toBe(true);
        });

        withClient('drain returns through the timer when an event never settles', async ({ client }) => {
            const { controller, fire } = client;

            vi.spyOn(controller, 'processEvent').mockReturnValue(new Promise<void>(() => undefined));
            fire?.({ reply: vi.fn() });
            controller.inFlight.close();

            await expect(controller.inFlight.drain(30)).resolves.toBeUndefined();
        });

        withClient('clears the drain timer when the in-flight set settles first', async ({ client }) => {
            const { controller, fire } = client;
            vi.spyOn(controller, 'processEvent').mockResolvedValue(undefined);
            fire?.({ reply: vi.fn() });
            controller.inFlight.close();

            vi.useFakeTimers();
            await controller.inFlight.drain(5000);
            expect(vi.getTimerCount()).toBe(0);
            vi.useRealTimers();
        });
    });
});
