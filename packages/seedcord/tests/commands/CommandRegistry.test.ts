import path from 'node:path';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Seedcord } from '@src/Seedcord';

import { testConfig } from '../utils/test-config';
import { TestEnvironment } from '../utils/test-env';

import '../utils/mock-client';
import '../utils/mock-env';

const seedcordPath = path.resolve(__dirname, '../../src/index').replace(/\\/g, '/');

describe('CommandRegistry Integration', () => {
    let testEnv: TestEnvironment;
    let seedcord: Seedcord;

    beforeEach(async () => {
        // @ts-expect-error: Accessing private method for testing
        Seedcord.reset();
        testEnv = new TestEnvironment('commands-test-');
        await testEnv.setup();
    });

    afterEach(async () => {
        await testEnv.teardown();
        vi.clearAllMocks();
    });

    it('should load commands from directory', async () => {
        const commandsDir = 'commands';
        await testEnv.createFile(
            `${commandsDir}/PingCommand.ts`,
            `
            import { BuilderComponent, RegisterCommand } from '${seedcordPath}';
            import { SlashCommandBuilder } from 'discord.js';

            @RegisterCommand('global')
            export class PingCommand extends BuilderComponent<'command'> {
                constructor() {
                    super('command');
                    this.instance.setName('ping').setDescription('Replies with Pong!');
                }
            }
            `
        );

        const config = testConfig({ commands: testEnv.resolvePath(commandsDir) });

        seedcord = new Seedcord(config);
        if (!seedcord.bot.commands) throw new Error('Commands not initialized');
        await seedcord.bot.commands.init();

        const globalCommands = seedcord.bot.commands.globalCommands;
        expect(globalCommands).toHaveLength(1);
        expect(globalCommands[0]?.name).toBe('ping');
    });

    it('should handle HMR updates for commands', async () => {
        const commandsDir = 'commands';
        const filePath = await testEnv.createFile(
            `${commandsDir}/PingCommand.ts`,
            `
            import { BuilderComponent, RegisterCommand } from '${seedcordPath}';
            import { SlashCommandBuilder } from 'discord.js';

            @RegisterCommand('global')
            export class PingCommand extends BuilderComponent<'command'> {
                constructor() {
                    super('command');
                    this.instance.setName('ping').setDescription('Replies with Pong!');
                }
            }
            `
        );

        const config = testConfig({ commands: testEnv.resolvePath(commandsDir) });

        seedcord = new Seedcord(config);
        if (!seedcord.bot.commands) throw new Error('Commands not initialized');
        await seedcord.bot.commands.init();

        expect(seedcord.bot.commands.globalCommands[0]?.name).toBe('ping');

        // Simulate HMR update: Change name
        await testEnv.createFile(
            `${commandsDir}/PingCommand.ts`,
            `
            import { BuilderComponent, RegisterCommand } from '${seedcordPath}';
            import { SlashCommandBuilder } from 'discord.js';

            @RegisterCommand('global')
            export class PingCommand extends BuilderComponent<'command'> {
                constructor() {
                    super('command');
                    this.instance.setName('pong').setDescription('Replies with Ping!');
                }
            }
            `
        );

        await seedcord.bot.commands.onHmr({
            file: filePath,
            type: 'update'
        });

        await seedcord.bot.commands.refresh();

        expect(seedcord.bot.commands.globalCommands).toHaveLength(1);
        expect(seedcord.bot.commands.globalCommands[0]?.name).toBe('pong');
    });
});
