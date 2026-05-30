import { DiscordAPIError, Guild, RESTJSONErrorCodes } from 'discord.js';
import { describe, it, expect } from 'vitest';

import { CouldNotFindChannel } from '@bErrors/Channels';
import { RoleDoesNotExist } from '@bErrors/Roles';
import { UserNotInGuild } from '@bErrors/User';
import { fetchText } from '@bUtilities/channels/fetchText';
import { fetchRole } from '@bUtilities/roles/fetchRole';
import { fetchGuildMember } from '@bUtilities/users/fetchGuildMember';

import type { Client } from 'discord.js';

function discordError(code: number): DiscordAPIError {
    return new DiscordAPIError({ code, message: 'discord error' }, code, 404, 'GET', '/x', {
        body: undefined,
        files: undefined
    });
}

describe('fetch* error discrimination', () => {
    describe('fetchGuildMember', () => {
        // fixture: only members.cache.get + members.fetch are touched.
        const guild = (reject: () => Promise<never>): Guild =>
            ({ members: { cache: { get: () => undefined }, fetch: reject } }) as unknown as Guild;

        it('rebrands UnknownMember as UserNotInGuild', async () => {
            const g = guild(() => Promise.reject(discordError(RESTJSONErrorCodes.UnknownMember)));
            await expect(fetchGuildMember(g, '123')).rejects.toBeInstanceOf(UserNotInGuild);
        });

        it('rethrows non-404 errors unchanged', async () => {
            const boom = new Error('rate limited');
            const g = guild(() => Promise.reject(boom));
            await expect(fetchGuildMember(g, '123')).rejects.toBe(boom);
        });
    });

    describe('fetchRole (guild branch)', () => {
        // fixture: set the prototype so `clientOrGuild instanceof Guild` enters the guild branch.
        const guild = (reject: () => Promise<never>): Guild => {
            const g = { roles: { cache: { get: () => undefined }, fetch: reject } };
            Object.setPrototypeOf(g, Guild.prototype);
            return g as unknown as Guild;
        };

        it('rebrands UnknownRole as RoleDoesNotExist', async () => {
            const g = guild(() => Promise.reject(discordError(RESTJSONErrorCodes.UnknownRole)));
            await expect(fetchRole(g, '123')).rejects.toBeInstanceOf(RoleDoesNotExist);
        });

        it('rethrows non-404 errors unchanged', async () => {
            const boom = new Error('forbidden');
            const g = guild(() => Promise.reject(boom));
            await expect(fetchRole(g, '123')).rejects.toBe(boom);
        });
    });

    describe('fetchText', () => {
        const client = (reject: () => Promise<never>): Client =>
            ({ channels: { cache: { get: () => undefined }, fetch: reject } }) as unknown as Client;

        it('rebrands UnknownChannel as CouldNotFindChannel', async () => {
            const c = client(() => Promise.reject(discordError(RESTJSONErrorCodes.UnknownChannel)));
            await expect(fetchText(c, '123')).rejects.toBeInstanceOf(CouldNotFindChannel);
        });

        it('rethrows non-404 errors unchanged', async () => {
            const boom = new Error('server error');
            const c = client(() => Promise.reject(boom));
            await expect(fetchText(c, '123')).rejects.toBe(boom);
        });
    });
});
