import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { Routes } from 'discord-api-types/v10';
import { assert, describe, expect, it, vi } from 'vite-plus/test';

import { folderEmoji } from '#src/miscellaneous/expectedEmojis';
import { resolveEmojis } from '#src/miscellaneous/resolveEmojis';

import type { ExpectedEmoji } from '#src/miscellaneous/expectedEmojis';
import type { REST } from '@discordjs/rest';
import type { APIEmoji } from 'discord-api-types/v10';
import type { Mock } from 'vite-plus/test';

const APP = 'app-1';

function apiEmoji(name: string, id: string, animated = false): APIEmoji {
    return { name, id, animated };
}

function inApp(key: string, name: string): ExpectedEmoji {
    return { kind: 'application', key, name, inFolder: false };
}

function inGuild(key: string, name: string, guildId = 'g1'): ExpectedEmoji {
    return { kind: 'guild', key, name, guildId };
}

interface Fixture {
    rest: Pick<REST, 'get'>;
    get: Mock<(route: string) => Promise<unknown>>;
}

function restWith(
    guildEmojis: Record<string, APIEmoji[]> = {},
    failOn: (route: string) => boolean = () => false
): Fixture {
    const application = [apiEmoji('confirm', '111'), apiEmoji('spin', '222', true)];
    const get = vi.fn((route: string) => {
        if (failOn(route)) return Promise.reject(new Error('Missing Access'));
        if (route === Routes.applicationEmojis(APP)) return Promise.resolve({ items: application });
        for (const [guildId, list] of Object.entries(guildEmojis)) {
            if (route === Routes.guildEmojis(guildId)) return Promise.resolve(list);
        }
        return Promise.reject(new Error(`unreachable route ${route}`));
    });
    return { rest: { get }, get };
}

function failureOf(expected: readonly ExpectedEmoji[], fixture = restWith()): Promise<unknown> {
    return resolveEmojis(fixture.rest, APP, expected).catch((error: unknown) => error);
}

describe('resolveEmojis', () => {
    it('resolves an application emoji by name, animated flag included', async () => {
        const expected = [inApp('Confirm', 'confirm'), inApp('Spin', 'spin')];

        const resolved = await resolveEmojis(restWith().rest, APP, expected);

        expect(`${resolved.Confirm}`).toBe('<:confirm:111>');
        expect(`${resolved.Spin}`).toBe('<a:spin:222>');
    });

    it('resolves a guild emoji from a name and guild id', async () => {
        const fixture = restWith({ g1: [apiEmoji('wave', '333')] });

        const resolved = await resolveEmojis(fixture.rest, APP, [inGuild('Wave', 'wave')]);

        expect(resolved.Wave?.id).toBe('333');
    });

    it('reads the guild route only once for two emojis from one guild', async () => {
        const { rest, get } = restWith({ g1: [apiEmoji('wave', '333'), apiEmoji('nod', '444')] });

        await resolveEmojis(rest, APP, [inGuild('Wave', 'wave'), inGuild('Nod', 'nod')]);

        expect(get.mock.calls.map((call) => call[0])).toEqual([Routes.guildEmojis('g1')]);
    });

    it('throws one aggregate holding every emoji it could not resolve', async () => {
        const caught = await failureOf([inApp('Missing', 'nope'), inApp('Gone', 'gone'), inApp('Confirm', 'confirm')]);

        assert(isSeedcordError(caught, 'SeedcordAggregateError', SeedcordErrorCode.ConfigEmojiUnresolved));
        expect(caught.errors).toMatchObject([
            { code: SeedcordErrorCode.ConfigEmojiNotFound, message: expect.stringContaining('Missing') as string },
            { code: SeedcordErrorCode.ConfigEmojiNotFound, message: expect.stringContaining('Gone') as string }
        ]);
    });

    it('reads the app emoji list once and reports each emoji when that read fails', async () => {
        const fixture = restWith({}, (route) => route === Routes.applicationEmojis(APP));

        const caught = await failureOf([inApp('Confirm', 'confirm'), inApp('Spin', 'spin')], fixture);

        assert(isSeedcordError(caught, 'SeedcordAggregateError', SeedcordErrorCode.ConfigEmojiUnresolved));
        expect(caught.errors).toMatchObject([
            {
                code: SeedcordErrorCode.ConfigEmojiSourceUnreadable,
                message: expect.stringContaining('Missing Access') as string
            },
            { code: SeedcordErrorCode.ConfigEmojiSourceUnreadable, message: expect.stringContaining('Spin') as string }
        ]);
        expect(fixture.get).toHaveBeenCalledOnce();
    });

    it('reads a guild once and reports each of its emojis when that read fails', async () => {
        const fixture = restWith({}, (route) => route === Routes.guildEmojis('g1'));

        const caught = await failureOf([inGuild('Wave', 'wave'), inGuild('Nod', 'nod')], fixture);

        assert(isSeedcordError(caught, 'SeedcordAggregateError', SeedcordErrorCode.ConfigEmojiUnresolved));
        expect(caught.errors).toMatchObject([
            {
                code: SeedcordErrorCode.ConfigEmojiSourceUnreadable,
                message: expect.stringContaining('guild g1') as string
            },
            { code: SeedcordErrorCode.ConfigEmojiSourceUnreadable, message: expect.stringContaining('Nod') as string }
        ]);
        expect(fixture.get).toHaveBeenCalledOnce();
    });

    it('reports an emoji whose payload has an empty id as not found', async () => {
        const caught = await failureOf([inGuild('Wave', 'wave')], restWith({ g1: [apiEmoji('wave', '')] }));

        expect(caught).toMatchObject({
            code: SeedcordErrorCode.ConfigEmojiNotFound,
            message: expect.stringContaining('guild g1') as string
        });
    });

    it.for<{ from: string; emoji: ExpectedEmoji; fix: string }>([
        { from: 'the emojis folder', emoji: folderEmoji({ key: 'Dot', name: 'dot' }), fix: 'seedcord emojis push' },
        { from: 'bot.emojis', emoji: inApp('Dot', 'dot'), fix: 'Check the spelling' }
    ])('gives the fix for a missing emoji that comes from $from', async ({ emoji, fix }) => {
        expect(await failureOf([emoji])).toMatchObject({
            code: SeedcordErrorCode.ConfigEmojiNotFound,
            message: expect.stringContaining(fix) as string
        });
    });
});
