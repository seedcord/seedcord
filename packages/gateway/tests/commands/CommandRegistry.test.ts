import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Seedcord } from '@src/Seedcord';

import { seedcordPath } from '../utils/source-path';
import { testConfig } from '../utils/test-config';
import { TestEnvironment } from '../utils/test-env';

import '../utils/mock-env';

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
        expect(seedcord.version).toBe('0.0.0');
        if (!seedcord.bot.commands) throw new Error('Commands not initialized');
        await seedcord.bot.commands.init();

        const globalCommands = seedcord.bot.commands.globalCommands;
        expect(globalCommands).toHaveLength(1);
        expect(globalCommands[0]?.name).toBe('ping');
    });

    it('resets the loading flag when the bulk load throws', async () => {
        const commandsDir = 'commands';
        await testEnv.createFile(
            `${commandsDir}/PingCommand.ts`,
            `
            import { BuilderComponent, RegisterCommand } from '${seedcordPath}';

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

        // fixture: access the private load + flag to force a mid-load throw
        const internal = seedcord.bot.commands as unknown as { loadCommands: () => Promise<void>; loading: boolean };
        vi.spyOn(internal, 'loadCommands').mockRejectedValue(new Error('load boom'));

        await expect(seedcord.bot.commands.init()).rejects.toThrow('load boom');
        expect(internal.loading).toBe(false);
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
