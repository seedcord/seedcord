import path from 'node:path';

import { Commands } from '@seedcord/core';
import { ApplicationCommandType, Routes } from 'discord-api-types/v10';
import { Envapter, merge, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InteractionDispatcher } from '#src/node/InteractionDispatcher';
import { Seedcord } from '#src/node/Seedcord';

import { createSigner } from '../../helpers/ed25519';
import { APP_ID, VALID_TOKEN } from '../../helpers/fixtures';

import type { HttpConfig } from '#src/interfaces/Config';

const COMMANDS_DIR = path.resolve(__dirname, './fixtures');
const HANDLERS_DIR = path.resolve(__dirname, '../discovery/fixtures/handlers');

// justified: the generated Commands map is empty in tests, so entries read through a plain record
const commands = Commands as Record<string, { id: string; mention: string } | undefined>;

function config(commandsPath: string | null, interactionsPath: string | null = null): HttpConfig {
    return {
        bot: {
            interactions: interactionsPath === null ? { path: null } : { path: interactionsPath },
            commands: commandsPath === null ? { path: null } : { path: commandsPath }
        },
        subscribers: { path: null },
        port: 0
    };
}

let live: Seedcord | undefined;

beforeEach(async () => {
    // @ts-expect-error singleton reset between tests
    Seedcord.reset();
    const signer = await createSigner();
    Envapter.useSource(
        merge(
            new PortableSource(process.env),
            new PortableSource({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN })
        )
    );
});

afterEach(async () => {
    await live?.shutdown.run(0, false);
    live = undefined;
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
        const host = new Seedcord(config(COMMANDS_DIR));
        live = host;
        const { put } = stubRest(host);

        await host.start();

        expect(put).toHaveBeenCalledOnce();
        expect(put.mock.calls[0]?.[0]).toBe(Routes.applicationCommands(APP_ID));
        expect((put.mock.calls[0]?.[1] as { body: { name: string }[] }).body[0]?.name).toBe('ping');
    });

    it('injects the deployed id into the Commands accessor', async () => {
        const host = new Seedcord(config(COMMANDS_DIR));
        live = host;
        stubRest(host);

        await host.start();

        expect(commands.ping?.id).toBe('cmd-1');
        expect(commands.ping?.mention).toBe('</ping:cmd-1>');
    });

    it('reads the application id out of the bot token', async () => {
        const host = new Seedcord(config(COMMANDS_DIR));
        live = host;
        stubRest(host);

        await host.start();

        expect(host.applicationId).toBe(APP_ID);
    });

    it('checks the deployed routes against the registered handlers', async () => {
        const slash = vi.spyOn(InteractionDispatcher.prototype, 'warnUnhandledRoutes');
        const menus = vi.spyOn(InteractionDispatcher.prototype, 'warnUnhandledContextMenuRoutes');
        const host = new Seedcord(config(COMMANDS_DIR, HANDLERS_DIR));
        live = host;
        stubRest(host);

        await host.start();

        expect([...(slash.mock.calls[0]?.[0] ?? [])]).toContain('ping');
        expect(menus).toHaveBeenCalledOnce();
    });

    it('never asks discord for the application id', async () => {
        const host = new Seedcord({
            ...config(COMMANDS_DIR),
            bot: { ...config(COMMANDS_DIR).bot, emojis: { Confirm: 'confirm' } }
        });
        live = host;
        const { get } = stubRest(host);

        await host.start();

        expect(get).not.toHaveBeenCalledWith(Routes.currentApplication());
    });

    it('touches no command route when no commands path is configured', async () => {
        const host = new Seedcord(config(null));
        live = host;
        const { get, put } = stubRest(host);

        await host.start();

        expect(put).not.toHaveBeenCalled();
        expect(get).not.toHaveBeenCalledWith(Routes.currentApplication());
    });
});
