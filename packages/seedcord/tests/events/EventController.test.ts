import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Seedcord } from '../../src/Seedcord';
import { TestEnvironment } from '../utils/test-env';

import type { Config } from '@seedcord/types';
import '../utils/mock-client';
import '../utils/mock-env';

const seedcordPath = path.resolve(__dirname, '../../src/index').replace(/\\/g, '/');

interface PrivateEventController {
    eventMap: Map<string, unknown[]>;
    init(): Promise<void>;
    onHmr(event: unknown): Promise<void>;
    processEvent(eventName: string, args: unknown[]): Promise<void>;
}

interface TestBot {
    events: PrivateEventController;
}

describe('EventController Integration', () => {
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

        const config: Config = {
            bot: {
                events: { path: testEnv.resolvePath(eventsDir) },
                interactions: { path: null },
                commands: { path: null },
                clientOptions: { intents: [] }
            },
            subscribers: { path: null }
        };

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

        const config: Config = {
            bot: {
                events: { path: testEnv.resolvePath(eventsDir) },
                interactions: { path: null },
                commands: { path: null },
                clientOptions: { intents: [] }
            },
            subscribers: { path: null }
        };

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

        const config: Config = {
            bot: {
                events: { path: testEnv.resolvePath(eventsDir) },
                interactions: { path: null },
                commands: { path: null },
                clientOptions: { intents: [] }
            },
            subscribers: { path: null }
        };

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

        const config: Config = {
            bot: {
                events: { path: testEnv.resolvePath(eventsDir) },
                interactions: { path: null },
                commands: { path: null },
                clientOptions: { intents: [] }
            },
            subscribers: { path: null }
        };

        seedcord = new Seedcord(config);
        // justified: TestBot exposes the private events controller for assertion
        const testBot = seedcord.bot as unknown as TestBot;
        await testBot.events.init();

        // the non-Error rethrows to the root, but the once handler is now spent
        await expect(testBot.events.processEvent('guildMemberAdd', [{}])).rejects.toBe('raw string');
        // a second fire must not re-run it, so it resolves with no throw
        await expect(testBot.events.processEvent('guildMemberAdd', [{}])).resolves.toBeUndefined();
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

        const config: Config = {
            bot: {
                events: { path: testEnv.resolvePath(eventsDir) },
                interactions: { path: null },
                commands: { path: null },
                clientOptions: { intents: [] }
            },
            subscribers: { path: null }
        };

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
});
