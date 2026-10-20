import { Commands } from '@seedcord/core';
import { GLOBAL_ID, setDevChannel } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { HostStartup, HostVersion } from '@seedcord/types/internal';
import { setDevFiles } from '@seedcord/utils/internal';
import { ApplicationCommandType, Collection, Events, GatewayIntentBits } from 'discord.js';
import { type Mock, describe, expect, afterEach, onTestFinished, vi } from 'vitest';

import { commandRegistryOf } from '#bot/Bot';
import { Plugin } from '#src/Plugin';
import { Seedcord } from '#src/Seedcord';
import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { it } from '#tests/utils/test-env';

import type { CommandInfo } from '@seedcord/core';
import type { CommandRegistry } from '@seedcord/core/internal';

function registryOf(instance: Seedcord): CommandRegistry {
    const registry = commandRegistryOf(instance.bot);
    if (!registry) throw new Error('this test config declares no commands path');
    return registry;
}

// @discordjs/rest rejects an aborted request with an AbortError before it reaches discord
function rejectWhenAborted(signal: AbortSignal): Promise<never> {
    return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('This operation was aborted', 'AbortError')));
    });
}

describe('CommandRegistry Integration', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should load commands from directory', async ({ testEnv }) => {
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

        await using seedcord = new Seedcord(config);
        expect(seedcord[HostVersion]).toBe('0.0.0');
        await registryOf(seedcord).init();

        const globalCommands = registryOf(seedcord).scopedCommands.get(GLOBAL_ID);
        expect(globalCommands).toHaveLength(1);
        expect(globalCommands?.[0]?.name).toBe('ping');
    });

    it('resets the loading flag when the bulk load throws', async ({ testEnv }) => {
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

        await using seedcord = new Seedcord(config);

        // fixture: access the private load + flag to force a mid-load throw
        const internal = registryOf(seedcord) as unknown as {
            loadCommands: () => Promise<void>;
            loading: boolean;
        };
        vi.spyOn(internal, 'loadCommands').mockRejectedValue(new Error('load boom'));

        await expect(registryOf(seedcord).init()).rejects.toThrow('load boom');
        expect(internal.loading).toBe(false);
    });

    it('should handle HMR updates for commands', async ({ testEnv }) => {
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

        await using seedcord = new Seedcord(config);
        await registryOf(seedcord).init();

        expect(registryOf(seedcord).scopedCommands.get(GLOBAL_ID)?.[0]?.name).toBe('ping');

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

        expect(registryOf(seedcord).scopedCommands.get(GLOBAL_ID)).toHaveLength(1);
        expect(registryOf(seedcord).scopedCommands.get(GLOBAL_ID)?.[0]?.name).toBe('pong');
    });

    it('cancels a deploy that is still waiting when startup is aborted', async ({ testEnv }) => {
        await testEnv.createFile(
            'commands/PingCommand.ts',
            `
            import { BuilderComponent, RegisterCommand } from '${seedcordPath}';

            @RegisterCommand('global')
            export class PingCommand extends BuilderComponent<'command'> {
                constructor() {
                    super('command');
                    this.instance.setName('ping').setDescription('Replies');
                }
            }
            `
        );
        const config = testConfig({ commands: testEnv.resolvePath('commands') });
        config.bot.clientOptions = { intents: [GatewayIntentBits.Guilds] };
        await using seedcord = new Seedcord(config);
        vi.spyOn(seedcord.bot, 'botToken', 'get').mockReturnValue('token');
        // the mock client never connects. login waits on ClientReady
        const client = seedcord.bot.client as unknown as { once: Mock; rest: { put: Mock } };
        client.once.mockImplementation((event: Events, onReady: () => void) => {
            if (event === Events.ClientReady) onReady();
        });
        const { promise: putSignal, resolve: sawPut } = Promise.withResolvers<AbortSignal>();
        client.rest.put.mockImplementation((_route: string, { signal }: { signal: AbortSignal }) => {
            sawPut(signal);
            return rejectWhenAborted(signal);
        });

        const starting = seedcord.start().catch(() => undefined);
        const signal = await putSignal;
        seedcord[HostStartup].abort();
        await starting;

        expect(signal.aborted).toBe(true);
    });

    it('starts when discord holds the deploy for 30s', async ({ testEnv }) => {
        await testEnv.createFile(
            'commands/PingCommand.ts',
            `
            import { BuilderComponent, RegisterCommand } from '${seedcordPath}';

            @RegisterCommand('global')
            export class PingCommand extends BuilderComponent<'command'> {
                constructor() {
                    super('command');
                    this.instance.setName('ping').setDescription('Replies');
                }
            }
            `
        );
        const config = testConfig({ commands: testEnv.resolvePath('commands'), healthCheck: false });
        config.bot.clientOptions = { intents: [GatewayIntentBits.Guilds] };
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
        try {
            await using seedcord = new Seedcord(config);
            vi.spyOn(seedcord.bot, 'botToken', 'get').mockReturnValue('token');
            const client = seedcord.bot.client as unknown as { once: Mock; rest: { put: Mock } };
            client.once.mockImplementation((event: Events, onReady: () => void) => {
                if (event === Events.ClientReady) onReady();
            });
            const { promise: putCalled, resolve: sawPut } = Promise.withResolvers<undefined>();
            client.rest.put.mockImplementation(async () => {
                sawPut(undefined);
                await new Promise((resolve) => setTimeout(resolve, 30_000));
                return [];
            });

            const starting = seedcord.start();
            await putCalled;
            await vi.advanceTimersByTimeAsync(30_000);

            await expect(starting).resolves.toBe(seedcord);
        } finally {
            vi.useRealTimers();
        }
    });

    it('fails startup at the login timeout when login hangs', async ({ testEnv }) => {
        await testEnv.createFile('commands/.keep', '');
        const config = testConfig({ commands: testEnv.resolvePath('commands'), healthCheck: false });
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
        try {
            await using seedcord = new Seedcord(config);
            vi.spyOn(seedcord.bot, 'botToken', 'get').mockReturnValue('token');
            const starting = seedcord.start().catch((error: unknown) => error);

            await vi.advanceTimersByTimeAsync(10_000);
            const failure = await starting;

            expect(failure).toHaveProperty('code', SeedcordErrorCode.LifecyclePhaseFailures);
            expect(failure).toHaveProperty(['errors', 0, 'code'], SeedcordErrorCode.LifecycleTaskTimeout);
            expect(failure).toHaveProperty(['errors', 0, 'message'], expect.stringContaining('bot-initialization'));
        } finally {
            vi.useRealTimers();
        }
    });

    it("deploys before a plugin's ready() runs", async ({ testEnv }) => {
        await testEnv.createFile(
            'commands/PingCommand.ts',
            `
            import { BuilderComponent, RegisterCommand } from '${seedcordPath}';

            @RegisterCommand('global')
            export class PingCommand extends BuilderComponent<'command'> {
                constructor() {
                    super('command');
                    this.instance.setName('ping').setDescription('Replies');
                }
            }
            `
        );
        class ReadsCommands extends Plugin {
            public mention: string | undefined;

            public init(): Promise<void> {
                return Promise.resolve();
            }

            public override ready(): Promise<void> {
                // justified: SlashRegistry is empty in tests
                this.mention = (Commands as Record<string, CommandInfo>).ping?.mention;
                return Promise.resolve();
            }
        }
        const config = testConfig({ commands: testEnv.resolvePath('commands'), healthCheck: false });
        config.bot.clientOptions = { intents: [GatewayIntentBits.Guilds] };
        await using seedcord = new Seedcord(config).attach('reader', ReadsCommands);
        vi.spyOn(seedcord.bot, 'botToken', 'get').mockReturnValue('token');
        const client = seedcord.bot.client as unknown as { once: Mock; rest: { put: Mock } };
        client.once.mockImplementation((event: Events, onReady: () => void) => {
            if (event === Events.ClientReady) onReady();
        });
        client.rest.put.mockResolvedValue([{ id: '42', name: 'ping', type: ApplicationCommandType.ChatInput }]);

        await seedcord.start();

        expect(seedcord.reader.mention).toBe('</ping:42>');
    });

    it('builds the commands after the emojis load', async ({ testEnv }) => {
        const commandFile = await testEnv.createFile(
            'commands/WaveCommand.ts',
            `
            import { BuilderComponent, Emojis, RegisterCommand } from '${seedcordPath}';

            @RegisterCommand('global')
            export class WaveCommand extends BuilderComponent<'command'> {
                constructor() {
                    super('command');
                    this.instance.setName('wave').setDescription(Emojis.Wave.name);
                }
            }
            `
        );
        // a cached module keeps the import well inside the 100ms emoji fetch
        await import(commandFile);
        const config = testConfig({ commands: testEnv.resolvePath('commands'), healthCheck: false });
        config.bot.clientOptions = { intents: [GatewayIntentBits.Guilds] };
        config.bot.emojis = { Wave: 'wave' };
        await using seedcord = new Seedcord(config);
        vi.spyOn(seedcord.bot, 'botToken', 'get').mockReturnValue('token');
        const client = seedcord.bot.client as unknown as {
            once: Mock;
            application: { emojis: { fetch: Mock; cache: Collection<string, { id: string; name: string }> } };
        };
        client.once.mockImplementation((event: Events, onReady: () => void) => {
            if (event === Events.ClientReady) onReady();
        });
        client.application.emojis = {
            fetch: vi.fn(() => new Promise((resolve) => setTimeout(resolve, 100))),
            cache: new Collection([['1', { id: '1', name: 'wave' }]])
        };

        await expect(seedcord.start()).resolves.toBe(seedcord);
    });

    it('holds an edited command for the refresh prompt when the commands path is relative to root', async ({
        testEnv
    }) => {
        using _dev = setDevFiles({
            root: testEnv.rootDir,
            listed: [],
            skippedFolders: []
        });
        const command = (name: string): string => `
            import { BuilderComponent, RegisterCommand } from '${seedcordPath}';

            @RegisterCommand('global')
            export class PingCommand extends BuilderComponent<'command'> {
                constructor() {
                    super('command');
                    this.instance.setName('${name}').setDescription('Replies');
                }
            }
            `;
        const filePath = await testEnv.createFile('commands/PingCommand.ts', command('ping'));

        await using seedcord = new Seedcord(testConfig({ commands: './commands' }));
        await registryOf(seedcord).init();
        await testEnv.createFile('commands/PingCommand.ts', command('pong'));
        await registryOf(seedcord).onHmr({ file: filePath, type: 'update' });

        expect(registryOf(seedcord).scopedCommands.get(GLOBAL_ID)?.[0]?.name).toBe('ping');
        await registryOf(seedcord).refresh();
        expect(registryOf(seedcord).scopedCommands.get(GLOBAL_ID)?.[0]?.name).toBe('pong');
    });

    it('sends no refresh prompt for a file saved in a dot-folder, which startup skips', async ({ testEnv }) => {
        using _dev = setDevFiles({
            root: testEnv.rootDir,
            listed: [],
            skippedFolders: []
        });
        const sent: string[] = [];
        setDevChannel({ send: (event) => sent.push(event), on: () => undefined, off: () => undefined });
        onTestFinished(() => setDevChannel(undefined));
        await testEnv.createFile('commands/PingCommand.ts', 'export {};\n');

        await using seedcord = new Seedcord(testConfig({ commands: './commands' }));
        await registryOf(seedcord).init();
        const draft = await testEnv.createFile('commands/.drafts/KickCommand.ts', 'export {};\n');
        await registryOf(seedcord).onHmr({ file: draft, type: 'create' });

        expect(sent).not.toContain('seedcord:commands-update-prompt');
    });
});
