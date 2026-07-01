import path from 'node:path';

import { Logger } from '@seedcord/services';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { setDevChannel } from '@hmr/devChannel';
import { Plugin } from '@interfaces/Plugin';
import { Seedcord } from '@src/Seedcord';

import { testConfig } from '../utils/test-config';
import { TestEnvironment } from '../utils/test-env';

import '../utils/mock-client';
import '../utils/mock-env';

import type { Core } from '@interfaces/Core';
import type { DevChannel, SeedcordCliEvents, SeedcordFrameworkEvents } from '@seedcord/types/internal';
import type { Mock } from 'vitest';

const seedcordPath = path.resolve(__dirname, '../../src/index').replace(/\\/g, '/');

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
    public logger = new Logger('CriticalPlugin');
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
    let testEnv: TestEnvironment;

    beforeEach(async () => {
        // @ts-expect-error reset the Seedcord singleton between tests
        Seedcord.reset();
        testEnv = new TestEnvironment('hmr-route-');
        await testEnv.setup();
    });

    afterEach(async () => {
        await testEnv.teardown();
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

    it('CommandRegistry listens for refresh-commands through the dev channel', async () => {
        const { channel, on } = fakeChannel();
        setDevChannel(channel);

        await testEnv.createFile('commands/Ping.ts', PING_COMMAND);
        const config = testConfig({ commands: testEnv.resolvePath('commands') });
        const seedcord = new Seedcord(config);
        if (!seedcord.bot.commands) throw new Error('Commands not initialized');
        await seedcord.bot.commands.init();

        expect(on).toHaveBeenCalledWith('seedcord:refresh-commands', expect.any(Function));
    });

    it('CommandRegistry.onHmr prompts a commands update through the dev channel', async () => {
        const { channel, send } = fakeChannel();
        setDevChannel(channel);

        const commandFile = await testEnv.createFile('commands/Ping.ts', PING_COMMAND);
        const config = testConfig({ commands: testEnv.resolvePath('commands') });
        const seedcord = new Seedcord(config);
        if (!seedcord.bot.commands) throw new Error('Commands not initialized');
        await seedcord.bot.commands.init();

        await seedcord.bot.commands.onHmr({ file: commandFile, type: 'update' });

        const sentEvents = send.mock.calls.map((args) => args[0]);
        expect(sentEvents).toContain('seedcord:commands-update-prompt');
        const promptPayload = send.mock.calls.find((args) => args[0] === 'seedcord:commands-update-prompt')?.[1];
        expect(promptPayload).toHaveProperty('files');
    });
});
