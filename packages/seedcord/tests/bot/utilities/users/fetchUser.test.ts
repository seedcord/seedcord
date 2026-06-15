import { Notice } from '@seedcord/kit';
import { DiscordAPIError, RESTJSONErrorCodes } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';

import { fetchUser } from '@bUtilities/users/fetchUser';

import type { ReplyResponse, RenderContext } from '@seedcord/types';
import type { Client } from 'discord.js';

class CustomNotFound extends Notice {
    constructor(public readonly arg: string) {
        super(`custom: ${arg}`);
    }
    render(): ReplyResponse {
        return { kind: 'embed', embeds: [] };
    }
}

// justified: the fixture implements only the client.users surface fetchUser reads.
function clientThatRejects(): Client {
    const err = new DiscordAPIError(
        { code: RESTJSONErrorCodes.UnknownUser, message: 'Unknown User' },
        RESTJSONErrorCodes.UnknownUser,
        404,
        'GET',
        'https://discord.com/api/users/123',
        { body: undefined, files: [] }
    );
    return {
        users: { cache: { get: () => undefined }, fetch: vi.fn().mockRejectedValue(err) }
    } as unknown as Client;
}

describe('fetchUser throwAs', () => {
    const ctx: RenderContext = { uuid: '11111111-2222-3333-4444-555555555555' };

    it('throws the default user-not-found denial, rendering the live userArg without reporting', async () => {
        const denial = await fetchUser(clientThatRejects(), '999').catch((e: unknown) => e);
        expect(denial).toBeInstanceOf(Notice);
        expect((denial as Notice).name).toBe('UserNotFound');
        expect((denial as Notice).report).toBe(false);

        const response = (denial as Notice).render(ctx);
        if (response.kind !== 'embed') throw new Error('expected embed arm');
        const [embed] = response.embeds;
        expect(embed?.data.title).toBe('User Not Found');
        expect(embed?.data.description).toContain('999');
    });

    it('throws the provided throwAs class instead of the default', async () => {
        await expect(fetchUser(clientThatRejects(), '123', { throwAs: CustomNotFound })).rejects.toBeInstanceOf(
            CustomNotFound
        );
    });
});
