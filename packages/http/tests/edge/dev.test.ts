import { BuilderComponent, RegisterCommand } from '@seedcord/core';
import { fromDevLogLine, setDevChannel } from '@seedcord/core/internal';
import { Plugin } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger, LoggerChannelRegistry } from '@seedcord/logger';
import { ApplicationCommandType, Routes } from 'discord-api-types/v10';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import { Seedcord } from '#src/edge/Seedcord';
import { BUILT_ROOT, clearBuiltFiles, registerBuiltFiles } from '#tests/helpers/builtFiles';
import { createSigner, signedRequest } from '#tests/helpers/ed25519';
import { APP_ID, VALID_TOKEN } from '#tests/helpers/fixtures';

import type { HttpEdgeConfig } from '#interfaces/Config';
import type { Signer } from '#tests/helpers/ed25519';
import type { HmrUpdateEvent } from '@seedcord/types';

const ping = '{"type":1}';

const config: HttpEdgeConfig = {
    bot: { interactions: { path: null }, commands: { path: null } },
    subscribers: { path: null }
};

interface FakeCli {
    readonly sent: [event: string, data: unknown][];
    events(): string[];
    start(): void;
    save(event: HmrUpdateEvent): void;
}

// the channel seedcord dev opens to the worker
function connectCli(): FakeCli {
    const sent: [string, unknown][] = [];
    const handlers = new Map<string, (data: unknown) => void>();
    setDevChannel({
        send: (event, data) => sent.push([event, data]),
        // justified: the fake stores every handler under one signature
        on: (event, handler) => handlers.set(event, handler as (data: unknown) => void)
    });
    return {
        sent,
        events: () => sent.map(([event]) => event),
        start: () => handlers.get('seedcord:start')?.({ colorLevel: 0 }),
        save: (event) => handlers.get('seedcord:hmr')?.(event)
    };
}

// workerd prints these and seedcord dev reads them back out of its console output
function consoleLines(): () => string[] {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    onTestFinished(() => log.mockRestore());
    return () => log.mock.calls.map((args) => String(args[0]));
}

async function liveEnv(): Promise<Signer> {
    const signer = await createSigner();
    Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: VALID_TOKEN, DISCORD_PUBLIC_KEY: signer.publicKeyHex }));
    return signer;
}

function stubDiscord(seedcord: Seedcord): void {
    const get = vi.fn((route: string) => (route === Routes.user('@me') ? { username: 'wave-bot' } : {}));
    Object.assign(seedcord.rest, { get });
}

describe('the edge Seedcord under seedcord dev', () => {
    afterEach(() => {
        // @ts-expect-error singleton reset between tests
        Seedcord.reset();
        setDevChannel(undefined);
        clearBuiltFiles();
        // each bot installs its log forwarder on the process-wide registry
        LoggerChannelRegistry.instance.reset();
    });

    it('starts when the CLI asks and answers without baked ids', async () => {
        const cli = connectCli();
        const signer = await liveEnv();
        const seedcord = new Seedcord(config);
        stubDiscord(seedcord);

        cli.start();

        await vi.waitFor(() => expect(cli.sent).toContainEqual(['seedcord:started', { username: 'wave-bot' }]));
        const response = await seedcord.fetch(await signedRequest(signer, ping));
        expect(response.status).toBe(200);
    });

    it('deploys the commands from the bot files when it starts', async () => {
        @RegisterCommand('global')
        class Ping extends BuilderComponent<'command'> {
            constructor() {
                super('command');
                this.instance.setName('ping').setDescription('Replies with pong');
            }
        }
        registerBuiltFiles({ '/commands/Ping.ts': { Ping } });
        const cli = connectCli();
        await liveEnv();
        const seedcord = new Seedcord({
            ...config,
            bot: { ...config.bot, commands: { path: `${BUILT_ROOT}/commands` } }
        });
        stubDiscord(seedcord);
        const put = vi.fn().mockResolvedValue([{ id: '7', name: 'ping', type: ApplicationCommandType.ChatInput }]);
        Object.assign(seedcord.rest, { put });

        cli.start();

        await vi.waitFor(() => expect(cli.events()).toEqual(['seedcord:started']));
        expect(put).toHaveBeenCalledWith(Routes.applicationCommands(APP_ID), expect.anything());
    });

    it('deploys on a second start after the emojis failed to load the first time', async () => {
        @RegisterCommand('global')
        class Ping extends BuilderComponent<'command'> {
            constructor() {
                super('command');
                this.instance.setName('ping').setDescription('Replies with pong');
            }
        }
        registerBuiltFiles({ '/commands/Ping.ts': { Ping } });
        const cli = connectCli();
        await liveEnv();
        const seedcord = new Seedcord({
            ...config,
            bot: { ...config.bot, commands: { path: `${BUILT_ROOT}/commands` }, emojis: { Wave: 'wave' } }
        });
        let emojiReads = 0;
        const get = vi.fn((route: string) => {
            if (route === Routes.user('@me')) return { username: 'wave-bot' };
            if (route !== Routes.applicationEmojis(APP_ID)) return {};
            emojiReads++;
            if (emojiReads === 1) return Promise.reject(new Error('discord answered 500'));
            return { items: [{ name: 'wave', id: '55' }] };
        });
        const put = vi.fn().mockResolvedValue([{ id: '7', name: 'ping', type: ApplicationCommandType.ChatInput }]);
        Object.assign(seedcord.rest, { get, put });

        cli.start();
        await vi.waitFor(() => expect(cli.events()).toEqual(['seedcord:start-failed']));
        cli.start();

        await vi.waitFor(() => expect(cli.events()).toEqual(['seedcord:start-failed', 'seedcord:started']));
        expect(put).toHaveBeenCalledOnce();
    });

    it("passes a saved file to a plugin's onHmr once started", async () => {
        const saved: string[] = [];
        class Cache extends Plugin {
            public init(): Promise<void> {
                return Promise.resolve();
            }
            public override onHmr(event: HmrUpdateEvent): Promise<void> {
                saved.push(event.file);
                return Promise.resolve();
            }
        }
        const cli = connectCli();
        await liveEnv();
        const seedcord = new Seedcord(config).attach('cache', Cache);
        stubDiscord(seedcord);
        cli.start();
        await vi.waitFor(() => expect(cli.events()).toEqual(['seedcord:started']));

        cli.save({ file: '/bot/config/cache.json', type: 'update' });

        await vi.waitFor(() => expect(saved).toEqual(['/bot/config/cache.json']));
    });

    it('writes each log to the console for the CLI as it happens', async () => {
        connectCli();
        await liveEnv();
        const lines = consoleLines();
        void new Seedcord(config);

        new Logger('Cache', { channel: 'bot' }).info('warming the cache');

        expect(lines().map(fromDevLogLine)).toContainEqual(
            expect.objectContaining({ label: 'Cache', message: 'warming the cache' })
        );
    });

    it('sends the logs its own constructor wrote', async () => {
        connectCli();
        await liveEnv();
        const lines = consoleLines();

        void new Seedcord(config);

        expect(lines().map(fromDevLogLine)).toContainEqual(
            expect.objectContaining({ label: 'HMR', message: 'Enabled' })
        );
    });

    it('sends the error back when the start fails, and requests fail with it too', async () => {
        const cli = connectCli();
        Envapter.useSource(new PortableSource({}));
        const seedcord = new Seedcord(config);

        cli.start();

        await vi.waitFor(() => expect(cli.events()).toEqual(['seedcord:start-failed']));
        const [, failed] = cli.sent.find(([event]) => event === 'seedcord:start-failed') ?? [];
        expect(failed).toHaveProperty(['error', 'code'], SeedcordErrorCode.ConfigMissingEnv);
        await expect(seedcord.fetch(new Request('https://bot.example', { method: 'POST' }))).rejects.toHaveProperty(
            'code',
            SeedcordErrorCode.ConfigMissingEnv
        );
    });
});
