import { HostVersion } from '@seedcord/types/internal';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { commandRegistryOf } from '#bot/Bot';
import { Seedcord } from '#src/Seedcord';

import { seedcordPath } from '../utils/source-path';
import { testConfig } from '../utils/test-config';
import { TestEnvironment } from '../utils/test-env';

import type { CommandRegistry } from '@seedcord/core/node/internal';

import '../utils/mock-env';

function registryOf(instance: Seedcord): CommandRegistry {
    const registry = commandRegistryOf(instance.bot);
    if (!registry) throw new Error('this test config declares no commands path');
    return registry;
}

describe('CommandRegistry Integration', () => {
    let testEnv: TestEnvironment;
    let seedcord: Seedcord;

    beforeEach(async () => {
        // @ts-expect-error reset the Seedcord singleton between tests
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
        expect(seedcord[HostVersion]).toBe('0.0.0');
        await registryOf(seedcord).init();

        const globalCommands = registryOf(seedcord).globalCommands;
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

        // fixture: access the private load + flag to force a mid-load throw
        const internal = registryOf(seedcord) as unknown as {
            loadCommands: () => Promise<void>;
            loading: boolean;
        };
        vi.spyOn(internal, 'loadCommands').mockRejectedValue(new Error('load boom'));

        await expect(registryOf(seedcord).init()).rejects.toThrow('load boom');
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
        await registryOf(seedcord).init();

        expect(registryOf(seedcord).globalCommands[0]?.name).toBe('ping');

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

        await registryOf(seedcord).onHmr({
            file: filePath,
            type: 'update'
        });

        await registryOf(seedcord).refresh();

        expect(registryOf(seedcord).globalCommands).toHaveLength(1);
        expect(registryOf(seedcord).globalCommands[0]?.name).toBe('pong');
    });
});
