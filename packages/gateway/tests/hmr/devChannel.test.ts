import { setDevChannel } from '@seedcord/core/internal';
import { Plugin } from '@seedcord/core/plugin';
import { describe, expect, afterEach, vi } from 'vitest';

import { commandRegistryOf } from '#bot/Bot';
import { Seedcord } from '#src/Seedcord';
import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { it } from '#tests/utils/test-env';

import '#tests/utils/mock-env';

import type { Core } from '#interfaces/Core';
import type { CommandRegistry } from '@seedcord/core/node/internal';
import type { DevChannel, SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';
import type { Mock } from 'vitest';

function registryOf(instance: Seedcord): CommandRegistry {
    const registry = commandRegistryOf(instance.bot);
    if (!registry) throw new Error('this test config declares no commands path');
    return registry;
}

type FrameworkChannel = DevChannel<SeedcordFrameworkEvents, SeedcordCliEvents>;
type SendMock = Mock<(event: string, data: unknown) => void>;
type OnMock = Mock<(event: string, cb: (data: unknown) => void) => void>;

function fakeChannel(): { channel: FrameworkChannel; send: SendMock; on: OnMock } {
    const send = vi.fn<(event: string, data: unknown) => void>();
    const on = vi.fn<(event: string, cb: (data: unknown) => void) => void>();
    // justified: a minimal stand-in for the dev wire so routing can be asserted without a vite server
    const channel = { send, on } as unknown as FrameworkChannel;
    return { channel, send, on };
}

class CriticalPlugin extends Plugin {
    public async init(): Promise<void> {
        await Promise.resolve();
    }
    public declareCritical(patterns: string[]): void {
        this.registerCriticalFiles(patterns);
    }
}

const PING_COMMAND = `
    import { BuilderComponent, RegisterCommand } from '${seedcordPath}';

    @RegisterCommand('global')
    export class PingCommand extends BuilderComponent<'command'> {
        constructor() {
            super('command');
            this.instance.setName('ping').setDescription('Replies with Pong!');
        }
    }
`;

describe('dev channel routing', () => {
    afterEach(() => {
        // drop the fake channel so a later test never inherits it
        setDevChannel(undefined);
        vi.clearAllMocks();
    });

    it('registerCriticalFiles sends through the dev channel', () => {
        const { channel, send } = fakeChannel();
        setDevChannel(channel);

        // justified: registerCriticalFiles never reads core, only the dev channel
        const plugin = new CriticalPlugin({} as Core);
        plugin.declareCritical(['migrations/*']);

        expect(send).toHaveBeenCalledWith('seedcord:register-critical-files', { patterns: ['migrations/*'] });
    });

    it('CommandRegistry listens for refresh-commands through the dev channel', async ({ testEnv }) => {
        const { channel, on } = fakeChannel();
        setDevChannel(channel);

        await testEnv.createFile('commands/Ping.ts', PING_COMMAND);
        const config = testConfig({ commands: testEnv.resolvePath('commands') });
        await using seedcord = new Seedcord(config);
        await registryOf(seedcord).init();

        expect(on).toHaveBeenCalledWith('seedcord:refresh-commands', expect.any(Function));
    });

    it('CommandRegistry.onHmr prompts a commands update through the dev channel', async ({ testEnv }) => {
        const { channel, send } = fakeChannel();
        setDevChannel(channel);

        const commandFile = await testEnv.createFile('commands/Ping.ts', PING_COMMAND);
        const config = testConfig({ commands: testEnv.resolvePath('commands') });
        await using seedcord = new Seedcord(config);
        await registryOf(seedcord).init();

        await registryOf(seedcord).onHmr({ file: commandFile, type: 'update' });

        const sentEvents = send.mock.calls.map((args) => args[0]);
        expect(sentEvents).toContain('seedcord:commands-update-prompt');
        const promptPayload = send.mock.calls.find((args) => args[0] === 'seedcord:commands-update-prompt')?.[1];
        expect(promptPayload).toHaveProperty('files');
    });
});
