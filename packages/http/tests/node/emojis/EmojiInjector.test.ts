import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { Routes } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

import { EmojiInjector, Emojis } from '#src/emojis/EmojiInjector';

import type { Core } from '#interfaces/Core';
import type { ResolvedEmoji } from '@seedcord/core';
import type { APIEmoji } from 'discord-api-types/v10';
import type { Mock } from 'vitest';

const APP = 'app-1';

// justified: EmojiMap is empty in tests, so runtime values read through a plain record
const emojis = Emojis as Record<string, ResolvedEmoji>;

function apiEmoji(name: string, id: string): APIEmoji {
    return { name, id, animated: false };
}

interface Fixture {
    core: Core;
    get: Mock<(route: string) => unknown>;
}

function coreWith(configEmojis: unknown): Fixture {
    const application = [apiEmoji('confirm', '111')];
    const get = vi.fn((route: string) => {
        if (route === Routes.applicationEmojis(APP)) return { items: application };
        throw new Error(`unreachable route ${route}`);
    });

    // justified: the injector reads only these three members off core
    const core = {
        config: { bot: { emojis: configEmojis } },
        applicationId: APP,
        rest: { get }
    } as unknown as Core;
    return { core, get };
}

describe('EmojiInjector', () => {
    it('resolves an application emoji by name', async () => {
        await new EmojiInjector(coreWith({ Confirm: 'confirm' }).core).init();

        expect(emojis.Confirm).toEqual({ name: 'confirm', id: '111', animated: false });
        expect(String(emojis.Confirm)).toBe('<:confirm:111>');
    });

    it('throws for the one emoji it could not resolve', async () => {
        const { core } = coreWith({ Missing: 'nope', Confirm: 'confirm' });

        const caught = await new EmojiInjector(core).init().catch((error: unknown) => error);

        expect(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.ConfigEmojiNotFound)).toBe(true);
        expect(String(caught)).toContain('nope');
    });

    it('skips every request when no emojis are configured', async () => {
        const { core, get } = coreWith({});

        await new EmojiInjector(core).init();

        expect(get).not.toHaveBeenCalled();
    });

    it('throws on a read before the injector resolves the key', async () => {
        await new EmojiInjector(coreWith({ Confirm: 'confirm' }).core).init();

        let caught: unknown;
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- the read is the assertion
            emojis.NeverConfigured;
        } catch (error) {
            caught = error;
        }

        expect(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.CoreAccessorUnresolved)).toBe(true);
    });
});
