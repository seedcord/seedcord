import path from 'node:path';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Seedcord } from '@src/Seedcord';

import { TestEnvironment } from '../utils/test-env';

import '../utils/mock-client';
import '../utils/mock-env';

import type { Config } from '@seedcord/types';

const seedcordPath = path.resolve(__dirname, '../../src/index').replace(/\\/g, '/');

interface PrivateInteractionController {
    slashMap: Map<string, unknown>;
    buttonMap: Map<string, unknown>;
    modalMap: Map<string, unknown>;
    init(): Promise<void>;
    onHmr(event: unknown): Promise<void>;
}

interface TestBot {
    interactions: PrivateInteractionController;
}

describe('InteractionController Integration', () => {
    let testEnv: TestEnvironment;
    let seedcord: Seedcord;

    beforeEach(async () => {
        // @ts-expect-error: Accessing private method for testing
        Seedcord.reset();
        testEnv = new TestEnvironment('interactions-test-');
        await testEnv.setup();
    });

    afterEach(async () => {
        await testEnv.teardown();
        vi.clearAllMocks();
    });

    it('should load interaction handlers from directory', async () => {
        const interactionsDir = 'interactions';
        await testEnv.createFile(
            `${interactionsDir}/Ping.ts`,
            `
            import { InteractionHandler, SlashRoute } from '${seedcordPath}';
            import { ChatInputCommandInteraction } from 'discord.js';

            @SlashRoute('ping')
            export class PingHandler extends InteractionHandler<ChatInputCommandInteraction> {
                public async execute() {
                    await this.interaction.reply('Pong!');
                }
            }
            `
        );

        const config: Config = {
            bot: {
                interactions: { path: testEnv.resolvePath(interactionsDir) },
                events: { path: null },
                commands: { path: null },
                clientOptions: { intents: [] }
            },
            subscribers: { path: null }
        };

        seedcord = new Seedcord(config);
        // justified: TestBot exposes the private interactions controller for assertion
        const testBot = seedcord.bot as unknown as TestBot;
        await testBot.interactions.init();

        const controller = testBot.interactions;
        expect(controller.slashMap.has('ping')).toBe(true);
    });

    it('should handle HMR updates for interaction handlers', async () => {
        const interactionsDir = 'interactions';
        const filePath = await testEnv.createFile(
            `${interactionsDir}/Button.ts`,
            `
            import { InteractionHandler, ButtonRoute } from '${seedcordPath}';
            import { ButtonInteraction } from 'discord.js';

            @ButtonRoute('click-me')
            export class ButtonHandler extends InteractionHandler<ButtonInteraction> {
                public async execute() {
                    await this.interaction.reply('Clicked!');
                }
            }
            `
        );

        const config: Config = {
            bot: {
                interactions: { path: testEnv.resolvePath(interactionsDir) },
                events: { path: null },
                commands: { path: null },
                clientOptions: { intents: [] }
            },
            subscribers: { path: null }
        };

        seedcord = new Seedcord(config);
        // justified: TestBot exposes the private interactions controller for assertion
        const testBot = seedcord.bot as unknown as TestBot;
        await testBot.interactions.init();

        let controller = testBot.interactions;
        expect(controller.buttonMap.has('click-me')).toBe(true);

        // Simulate HMR update: Change ID
        await testEnv.createFile(
            `${interactionsDir}/Button.ts`,
            `
            import { InteractionHandler, ButtonRoute } from '${seedcordPath}';
            import { ButtonInteraction } from 'discord.js';

            @ButtonRoute('dont-click-me')
            export class ButtonHandler extends InteractionHandler<ButtonInteraction> {
                public async execute() {
                    await this.interaction.reply('Why did you click?');
                }
            }
            `
        );

        await testBot.interactions.onHmr({
            file: filePath,
            type: 'update'
        });

        controller = testBot.interactions;
        expect(controller.buttonMap.has('click-me')).toBe(false);
        expect(controller.buttonMap.has('dont-click-me')).toBe(true);
    });
});
