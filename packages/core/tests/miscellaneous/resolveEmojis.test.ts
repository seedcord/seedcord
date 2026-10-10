import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { Routes } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

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

    it('throws listing every emoji it could not resolve', async () => {
        const caught = await failureOf({ Missing: 'nope', Gone: 'gone', Confirm: 'confirm' });

        expect(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.ConfigEmojiUnresolved)).toBe(true);
        expect(String(caught)).toContain('"nope" for "Missing"');
        expect(String(caught)).toContain('"gone" for "Gone"');
    });

    it('reports each emoji when the application emojis could not be read, fetching them once', async () => {
        const fixture = restWith({}, (route) => route === Routes.applicationEmojis(APP));

        const caught = await failureOf({ Confirm: 'confirm', Spin: 'spin' }, fixture);

        expect(caught).toHaveProperty('message', expect.stringContaining('Could not resolve 2 configured emojis'));
        expect(String(caught)).toContain(
            '"confirm" for "Confirm" is an application emoji, and those could not be read (Missing Access)'
        );
        expect(String(caught)).toContain('"spin" for "Spin"');
        expect(fixture.get).toHaveBeenCalledOnce();
    });

    it('reports each emoji from a guild that could not be read, fetching it once', async () => {
        const fixture = restWith({}, (route) => route === Routes.guildEmojis('g1'));

        const caught = await failureOf({ Wave: ['wave', 'g1'], Nod: ['nod', 'g1'] }, fixture);

        expect(String(caught)).toContain(
            '"wave" for "Wave" targets guild g1, which could not be read (Missing Access)'
        );
        expect(String(caught)).toContain('"nod" for "Nod" targets guild g1');
        expect(fixture.get).toHaveBeenCalledOnce();
    });

    it('reports a configured value that is neither a name nor a tuple', async () => {
        const caught = await failureOf({ Bad: 42 });

        expect(String(caught)).toContain('"Bad" has an invalid value');
    });

    it('reports an emoji whose payload carries no id', async () => {
        const caught = await failureOf({ Wave: ['wave', 'g1'] }, restWith({ g1: [apiEmoji('wave', '')] }));

        expect(String(caught)).toContain('was not found in guild g1');
    });
});
