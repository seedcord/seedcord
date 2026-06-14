import { DiscordAPIError, RESTJSONErrorCodes } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';

import { UserNotFound } from '@bErrors/User';
import { fetchUser } from '@bUtilities/users/fetchUser';
import { Denial } from '@interfaces/Components';

import type { ReplyResponse } from '@seedcord/types';
import type { Client } from 'discord.js';

class CustomNotFound extends Denial {
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
    it('throws UserNotFound by default when the user is unknown', async () => {
        await expect(fetchUser(clientThatRejects(), '123')).rejects.toBeInstanceOf(UserNotFound);
    });

    it('throws the provided throwAs class instead of the default', async () => {
        await expect(fetchUser(clientThatRejects(), '123', { throwAs: CustomNotFound })).rejects.toBeInstanceOf(
            CustomNotFound
        );
    });
});
