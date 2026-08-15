import path from 'node:path';

import { Routes } from 'discord-api-types/v10';
import { Envapter, merge, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Emojis } from '#src/emojis/EmojiInjector';
import { Seedcord } from '#src/node/Seedcord';

import { createSigner } from '../../helpers/ed25519';
import { VALID_TOKEN } from '../../helpers/fixtures';

import type { ResolvedEmoji } from '#src/emojis/EmojiInjector';
import type { HttpConfig } from '#src/interfaces/Config';

const HANDLERS_DIR = path.resolve(__dirname, '../discovery/fixtures/handlers');
const APP = 'app-1';

// justified: EmojiMap is empty in tests, so runtime values read through a plain record
const emojis = Emojis as Record<string, ResolvedEmoji>;

function config(): HttpConfig {
    return {
        bot: {
            interactions: { path: HANDLERS_DIR },
            commands: { path: null },
            emojis: { Confirm: 'confirm' }
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

describe('emoji injection during startup', () => {
    it('resolves a configured emoji before the server accepts interactions', async () => {
        const host = new Seedcord(config());
        live = host;
        const get = vi.fn((route: string) => {
            if (route === Routes.currentApplication()) return { id: APP };
            if (route === Routes.applicationEmojis(APP)) return { items: [{ name: 'confirm', id: '111' }] };
            return {};
        });
        vi.spyOn(host.rest, 'get').mockImplementation(get as never);

        await host.start();

        expect(emojis.Confirm?.id).toBe('111');
        expect(host.port).toBeGreaterThan(0);
    });
});
