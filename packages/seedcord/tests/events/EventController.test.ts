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
            effects: { path: null }
        };

        seedcord = new Seedcord(config);
        await (seedcord.bot as unknown as TestBot).events.init();

        // Access private eventMap to verify registration
        const controller = (seedcord.bot as unknown as TestBot).events;
        expect(controller.eventMap.has('ready')).toBe(true);
        expect(controller.eventMap.get('ready')).toHaveLength(1);
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
            effects: { path: null }
        };

        seedcord = new Seedcord(config);
        await (seedcord.bot as unknown as TestBot).events.init();

        let controller = (seedcord.bot as unknown as TestBot).events;
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
        await (seedcord.bot as unknown as TestBot).events.onHmr({
            file: filePath,
            type: 'update'
        });

        controller = (seedcord.bot as unknown as TestBot).events;

        expect(controller.eventMap.has('messageCreate')).toBe(false);
        expect(controller.eventMap.has('messageUpdate')).toBe(true);
    });
});
