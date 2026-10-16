import path from 'node:path';

import { Commands } from '@seedcord/core';
import { setDevChannel } from '@seedcord/core/internal';
import { HostStartup } from '@seedcord/types/internal';
import { ApplicationCommandType, Routes } from 'discord-api-types/v10';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import { InteractionDispatcher } from '#src/dispatch/InteractionDispatcher';
import { Seedcord } from '#src/node/Seedcord';
import { APP_ID } from '#tests/helpers/fixtures';
import { bindSignedEnv, serverConfig } from '#tests/helpers/nodeHost';

import type { HttpServerConfig } from '#src/interfaces/Config';
import type { DeployedHashes } from '@seedcord/types/internal';

const COMMANDS_DIR = path.resolve(__dirname, './fixtures');
const EMOJI_COMMANDS_DIR = path.resolve(__dirname, './emoji-fixtures');
const HANDLERS_DIR = path.resolve(__dirname, '../discovery/fixtures/handlers');

// justified: the generated Commands map is empty in tests, so entries read through a plain record
const commands = Commands as Record<string, { id: string; mention: string } | undefined>;

function config(commandsPath: string | null, interactionsPath: string | null = null): HttpServerConfig {
    return serverConfig({ interactions: { path: interactionsPath }, commands: { path: commandsPath } });
}

beforeEach(async () => {
    await bindSignedEnv();
});

const DEPLOYED = [{ id: 'cmd-1', name: 'ping', type: ApplicationCommandType.ChatInput }];

// REST's verb methods sit far up its prototype chain, where vi.spyOn resolves get and reports put
// as undefined. assigning own properties shadows both.
function stubRest(
    host: Seedcord,
    deployed = DEPLOYED
): { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> } {
    const get = vi.fn((route: string) => {
        if (route === Routes.currentApplication()) return { id: APP_ID };
        if (route === Routes.applicationEmojis(APP_ID)) return { items: [{ name: 'confirm', id: '111' }] };
        if (route === Routes.applicationCommands(APP_ID)) return deployed;
        return {};
    });
    const put = vi.fn().mockResolvedValue(deployed);
    Object.assign(host.rest, { get, put });
    return { get, put };
}

// @discordjs/rest rejects an aborted request with an AbortError before it reaches discord
function rejectWhenAborted(signal: AbortSignal): Promise<never> {
    return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('This operation was aborted', 'AbortError')));
    });
}

describe('command deploy during http startup', () => {
    it('deploys the scanned commands to the global route', async () => {
        await using host = new Seedcord(config(COMMANDS_DIR));
        const { put } = stubRest(host);

        await host.start();

        expect(put).toHaveBeenCalledOnce();
        expect(put.mock.calls[0]?.[0]).toBe(Routes.applicationCommands(APP_ID));
        expect((put.mock.calls[0]?.[1] as { body: { name: string }[] }).body[0]?.name).toBe('ping');
    });

    it('injects the deployed id into the Commands accessor', async () => {
        await using host = new Seedcord(config(COMMANDS_DIR));
        stubRest(host);

        await host.start();

        expect(commands.ping?.id).toBe('cmd-1');
        expect(commands.ping?.mention).toBe('</ping:cmd-1>');
    });

    it('reads the ids and deploys nothing when seedcord dev holds the hashes of an unchanged deploy', async () => {
        let saved: DeployedHashes | undefined;
        const handlers = new Map<string, (data: unknown) => void>();
        setDevChannel({
            send: (event, data) => {
                if (event === 'seedcord:commands-deployed') saved = data as DeployedHashes;
                else if (event === 'seedcord:read-deployed')
                    handlers.get('seedcord:last-deploy')?.({ deployed: saved });
            },
            // justified: the fake keeps every handler under one signature
            on: (event, handler) => handlers.set(event, handler as (data: unknown) => void),
            off: (event) => handlers.delete(event)
        });
        onTestFinished(() => setDevChannel(undefined));
        {
            await using first = new Seedcord(config(COMMANDS_DIR));
            stubRest(first);
            await first.start();
        }

        await using second = new Seedcord(config(COMMANDS_DIR));
        // a new id proves the second start injected what it read
        const { get, put } = stubRest(second, [{ id: 'cmd-2', name: 'ping', type: ApplicationCommandType.ChatInput }]);
        await second.start();

        expect(put).not.toHaveBeenCalled();
        expect(get).toHaveBeenCalledWith(Routes.applicationCommands(APP_ID), expect.anything());
        expect(commands.ping?.mention).toBe('</ping:cmd-2>');
    });

    it('reads the application id out of the bot token', async () => {
        await using host = new Seedcord(config(COMMANDS_DIR));
        stubRest(host);

        await host.start();

        expect(host.applicationId).toBe(APP_ID);
    });

    it('checks the deployed routes against the registered handlers', async () => {
        const slash = vi.spyOn(InteractionDispatcher.prototype, 'warnUnhandledRoutes');
        const menus = vi.spyOn(InteractionDispatcher.prototype, 'warnUnhandledContextMenuRoutes');
        await using host = new Seedcord(config(COMMANDS_DIR, HANDLERS_DIR));
        stubRest(host);

        await host.start();

        expect([...(slash.mock.calls[0]?.[0] ?? [])]).toContain('ping');
        expect(menus).toHaveBeenCalledOnce();
    });

    it('never asks discord for the application id', async () => {
        await using host = new Seedcord({
            ...config(COMMANDS_DIR),
            bot: { ...config(COMMANDS_DIR).bot, emojis: { Confirm: 'confirm' } }
        });
        const { get } = stubRest(host);

        await host.start();

        expect(get).not.toHaveBeenCalledWith(Routes.currentApplication());
    });

    it('cancels a deploy that is still waiting when startup is aborted', async () => {
        await using host = new Seedcord(config(COMMANDS_DIR));
        stubRest(host);
        const { promise: putSignal, resolve: sawPut } = Promise.withResolvers<AbortSignal>();
        const put = vi.fn((_route: string, { signal }: { signal: AbortSignal }) => {
            sawPut(signal);
            return rejectWhenAborted(signal);
        });
        Object.assign(host.rest, { put });

        const starting = host.start().catch(() => undefined);
        const signal = await putSignal;
        host[HostStartup].abort();
        await starting;

        expect(signal.aborted).toBe(true);
    });

    it('starts when discord holds the deploy for 30s', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
        try {
            await using host = new Seedcord(config(COMMANDS_DIR));
            stubRest(host);
            const { promise: putCalled, resolve: sawPut } = Promise.withResolvers<undefined>();
            const put = vi.fn(async () => {
                sawPut(undefined);
                await new Promise((resolve) => setTimeout(resolve, 30_000));
                return [{ id: 'cmd-1', name: 'ping', type: ApplicationCommandType.ChatInput }];
            });
            Object.assign(host.rest, { put });

            const starting = host.start();
            await putCalled;
            await vi.advanceTimersByTimeAsync(30_000);

            await expect(starting).resolves.toBe(host);
        } finally {
            vi.useRealTimers();
        }
    });

    it('builds the commands after the emojis load', async () => {
        // a cached module keeps the import well inside the 100ms emoji fetch
        await import('./emoji-fixtures/Wave');
        const base = config(EMOJI_COMMANDS_DIR);
        await using host = new Seedcord({ ...base, bot: { ...base.bot, emojis: { Wave: 'wave' } } });
        const get = vi.fn(async (route: string) => {
            if (route !== Routes.applicationEmojis(APP_ID)) return {};
            await new Promise((resolve) => setTimeout(resolve, 100));
            return { items: [{ name: 'wave', id: '111' }] };
        });
        Object.assign(host.rest, { get, put: vi.fn().mockResolvedValue([]) });

        await expect(host.start()).resolves.toBe(host);
    });

    it('touches no command route when no commands path is configured', async () => {
        await using host = new Seedcord(config(null));
        const { get, put } = stubRest(host);

        await host.start();

        expect(put).not.toHaveBeenCalled();
        expect(get).not.toHaveBeenCalledWith(Routes.currentApplication());
    });
});
