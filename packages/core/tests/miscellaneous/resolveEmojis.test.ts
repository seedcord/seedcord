import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { Routes } from 'discord-api-types/v10';
import { assert, describe, expect, it, vi } from 'vitest';

import { resolveEmojis } from '#src/miscellaneous/resolveEmojis';

import type { REST } from '@discordjs/rest';
import type { APIEmoji } from 'discord-api-types/v10';
import type { Mock } from 'vitest';

const APP = 'app-1';

function apiEmoji(name: string, id: string, animated = false): APIEmoji {
    return { name, id, animated };
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

function failureOf(configured: Record<string, unknown>, fixture = restWith()): Promise<unknown> {
    return resolveEmojis(fixture.rest, APP, configured).catch((error: unknown) => error);
}

describe('resolveEmojis', () => {
    it('resolves an application emoji by name, animated flag included', async () => {
        const resolved = await resolveEmojis(restWith().rest, APP, { Confirm: 'confirm', Spin: 'spin' });

        expect(String(resolved.Confirm)).toBe('<:confirm:111>');
        expect(String(resolved.Spin)).toBe('<a:spin:222>');
    });

    it('resolves a guild emoji from a name and guild id', async () => {
        const fixture = restWith({ g1: [apiEmoji('wave', '333')] });

        const resolved = await resolveEmojis(fixture.rest, APP, { Wave: ['wave', 'g1'] });

        expect(resolved.Wave?.id).toBe('333');
    });

    it('reads only the guild route, once, for two emojis from one guild', async () => {
        const { rest, get } = restWith({ g1: [apiEmoji('wave', '333'), apiEmoji('nod', '444')] });

        await resolveEmojis(rest, APP, { Wave: ['wave', 'g1'], Nod: ['nod', 'g1'] });

        expect(get.mock.calls.map((call) => call[0])).toEqual([Routes.guildEmojis('g1')]);
    });

    it('throws one aggregate holding every emoji it could not resolve', async () => {
        const caught = await failureOf({ Missing: 'nope', Gone: 'gone', Confirm: 'confirm' });

        assert(isSeedcordError(caught, 'SeedcordAggregateError', SeedcordErrorCode.ConfigEmojiUnresolved));
        expect(caught.errors).toMatchObject([
            { code: SeedcordErrorCode.ConfigEmojiNotFound, message: expect.stringContaining('Missing') as string },
            { code: SeedcordErrorCode.ConfigEmojiNotFound, message: expect.stringContaining('Gone') as string }
        ]);
    });

    it('reads the app emoji list once and reports each emoji when that read fails', async () => {
        const fixture = restWith({}, (route) => route === Routes.applicationEmojis(APP));

        const caught = await failureOf({ Confirm: 'confirm', Spin: 'spin' }, fixture);

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

        const caught = await failureOf({ Wave: ['wave', 'g1'], Nod: ['nod', 'g1'] }, fixture);

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

    it('throws a type error for a configured value that is neither a name nor a tuple', async () => {
        const caught = await failureOf({ Bad: 42 });

        expect(isSeedcordError(caught, 'SeedcordTypeError', SeedcordErrorCode.ConfigEmojiInvalid)).toBe(true);
    });

    it('reports a tuple with an empty slot as an invalid value', async () => {
        const caught = await failureOf({ Hole: ['wave', ,] });

        expect(isSeedcordError(caught, 'SeedcordTypeError', SeedcordErrorCode.ConfigEmojiInvalid)).toBe(true);
    });

    it('reports an emoji whose payload carries no id as not found', async () => {
        const caught = await failureOf({ Wave: ['wave', 'g1'] }, restWith({ g1: [apiEmoji('wave', '')] }));

        expect(caught).toMatchObject({
            code: SeedcordErrorCode.ConfigEmojiNotFound,
            message: expect.stringContaining('guild g1') as string
        });
    });
});
