import path from 'node:path';

import { Routes } from 'discord-api-types/v10';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Emojis } from '#src/emojis/EmojiInjector';
import { Seedcord } from '#src/node/Seedcord';
import { APP_ID } from '#tests/helpers/fixtures';
import { bindSignedEnv, serverConfig } from '#tests/helpers/nodeHost';

import type { HttpServerConfig } from '#src/interfaces/Config';
import type { ResolvedEmoji } from '@seedcord/core';

const HANDLERS_DIR = path.resolve(__dirname, '../discovery/fixtures/handlers');

// justified: EmojiMap is empty in tests, so runtime values read through a plain record
const emojis = Emojis as Record<string, ResolvedEmoji>;

function config(): HttpServerConfig {
    return serverConfig({ interactions: { path: HANDLERS_DIR }, emojis: { Confirm: 'confirm' } });
}

beforeEach(async () => {
    await bindSignedEnv();
});

describe('emoji injection during startup', () => {
    it('resolves a configured emoji before the server accepts interactions', async () => {
        await using host = new Seedcord(config());
        const get = vi.fn((route: string) => {
            if (route === Routes.currentApplication()) return { id: APP_ID };
            if (route === Routes.applicationEmojis(APP_ID)) return { items: [{ name: 'confirm', id: '111' }] };
            return {};
        });
        vi.spyOn(host.rest, 'get').mockImplementation(get as never);

        await host.start();

        expect(emojis.Confirm?.id).toBe('111');
        expect(host.port).toBeGreaterThan(0);
    });
});
