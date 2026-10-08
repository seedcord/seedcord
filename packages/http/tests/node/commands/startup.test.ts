import path from 'node:path';

import { Commands } from '@seedcord/core';
import { ApplicationCommandType, Routes } from 'discord-api-types/v10';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InteractionDispatcher } from '#src/dispatch/InteractionDispatcher';
import { Seedcord } from '#src/node/Seedcord';
import { APP_ID } from '#tests/helpers/fixtures';
import { bindSignedEnv, serverConfig } from '#tests/helpers/nodeHost';

import type { HttpServerConfig } from '#src/interfaces/Config';

const COMMANDS_DIR = path.resolve(__dirname, './fixtures');
const HANDLERS_DIR = path.resolve(__dirname, '../discovery/fixtures/handlers');

// justified: the generated Commands map is empty in tests, so entries read through a plain record
const commands = Commands as Record<string, { id: string; mention: string } | undefined>;

function config(commandsPath: string | null, interactionsPath: string | null = null): HttpServerConfig {
    return serverConfig({ interactions: { path: interactionsPath }, commands: { path: commandsPath } });
}

beforeEach(async () => {
    await bindSignedEnv();
});

// REST's verb methods sit far up its prototype chain, where vi.spyOn resolves get and reports put
// as undefined. assigning own properties shadows both.
function stubRest(host: Seedcord): { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> } {
    const get = vi.fn((route: string) => {
        if (route === Routes.currentApplication()) return { id: APP_ID };
        if (route === Routes.applicationEmojis(APP_ID)) return { items: [{ name: 'confirm', id: '111' }] };
        return {};
    });
    const put = vi.fn().mockResolvedValue([{ id: 'cmd-1', name: 'ping', type: ApplicationCommandType.ChatInput }]);
    Object.assign(host.rest, { get, put });
    return { get, put };
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

    it('touches no command route when no commands path is configured', async () => {
        await using host = new Seedcord(config(null));
        const { get, put } = stubRest(host);

        await host.start();

        expect(put).not.toHaveBeenCalled();
        expect(get).not.toHaveBeenCalledWith(Routes.currentApplication());
    });
});
