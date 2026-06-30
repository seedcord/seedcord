import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Seedcord } from '../../src/Seedcord';
import { testConfig } from '../utils/test-config';
import { TestEnvironment } from '../utils/test-env';

import '../utils/mock-client';
import '../utils/mock-env';

const seedcordPath = path.resolve(__dirname, '../../src/index').replace(/\\/g, '/');

interface PrivateEventDispatcher {
    eventMap: Map<string, unknown[]>;
    init(): Promise<void>;
    onHmr(event: unknown): Promise<void>;
    processEvent(eventName: string, args: unknown[]): Promise<void>;
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

        // Simulate HMR update
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

        // Manually trigger onHmr since we don't have a real watcher
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
});
