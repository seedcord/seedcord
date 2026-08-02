import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { Routes } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

import { EmojiInjector, Emojis } from '@src/emojis/EmojiInjector';

import type { Core } from '@interfaces/Core';
import type { ResolvedEmoji } from '@src/emojis/EmojiInjector';
import type { APIEmoji } from 'discord-api-types/v10';

const APP = 'app-1';

// justified: EmojiMap is empty in tests, so runtime values read through a plain record
const emojis = Emojis as Record<string, ResolvedEmoji>;

function apiEmoji(name: string, id: string, animated = false): APIEmoji {
    return { name, id, animated };
}

interface Fixture {
    core: Core;
    get: ReturnType<typeof vi.fn>;
}

function coreWith(configEmojis: unknown, guildEmojis: Record<string, APIEmoji[]> = {}): Fixture {
    const application = [apiEmoji('confirm', '111'), apiEmoji('spin', '222', true)];
    const get = vi.fn((route: string) => {
        if (route === Routes.currentApplication()) return { id: APP };
        if (route === Routes.applicationEmojis(APP)) return { items: application };
        for (const [guildId, list] of Object.entries(guildEmojis)) {
            if (route === Routes.guildEmojis(guildId)) return list;
        }
        throw new Error(`unreachable route ${route}`);
    });

    // justified: the injector reads only the emoji config and the REST getter
    const core = { config: { bot: { emojis: configEmojis } }, rest: { get } } as unknown as Core;
    return { core, get };
}

describe('EmojiInjector', () => {
    it('resolves an application emoji by name', async () => {
        await new EmojiInjector(coreWith({ Confirm: 'confirm' }).core).init();

        expect(emojis.Confirm).toEqual({ name: 'confirm', id: '111', animated: false });
        expect(String(emojis.Confirm)).toBe('<:confirm:111>');
    });

    it('carries the animated flag through to the mention', async () => {
        await new EmojiInjector(coreWith({ Spin: 'spin' }).core).init();

        expect(String(emojis.Spin)).toBe('<a:spin:222>');
    });

    it('resolves a guild emoji from a name and guild id', async () => {
        const { core } = coreWith({ Wave: ['wave', 'g1'] }, { g1: [apiEmoji('wave', '333')] });

        await new EmojiInjector(core).init();

        expect(emojis.Wave?.id).toBe('333');
    });

    it('fetches each guild once for two emojis from the same guild', async () => {
        const { core, get } = coreWith(
            { Wave: ['wave', 'g1'], Nod: ['nod', 'g1'] },
            { g1: [apiEmoji('wave', '333'), apiEmoji('nod', '444')] }
        );

        await new EmojiInjector(core).init();

        expect(get.mock.calls.filter((call) => call[0] === Routes.guildEmojis('g1'))).toHaveLength(1);
    });

    it('throws listing every emoji it could not resolve', async () => {
        const { core } = coreWith({ Missing: 'nope', Confirm: 'confirm' });

        const caught = await new EmojiInjector(core).init().catch((error: unknown) => error);

        expect(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.ConfigEmojiUnresolved)).toBe(true);
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
