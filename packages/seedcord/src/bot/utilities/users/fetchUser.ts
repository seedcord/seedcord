import { DiscordAPIError, RESTJSONErrorCodes } from 'discord.js';

import { UserNotFound } from '@bot/defaults/errors/User';

import type { Denial } from '@interfaces/Components';
import type { Client, User } from 'discord.js';

/**
 * Options for {@link fetchUser}.
 */
export interface FetchUserOptions {
    /** Denial to throw when the user does not exist. Defaults to {@link UserNotFound}. */
    throwAs?: new (userArg: string) => Denial;
}

/**
 * Fetches a Discord user by ID with error handling.
 *
 * @param client - The Discord client instance
 * @param userId - The Discord user ID
 * @param options - Optional overrides, including the {@link FetchUserOptions.throwAs} denial
 * @returns Promise resolving to the user
 * @throws The {@link FetchUserOptions.throwAs} denial (default {@link UserNotFound}) when the user doesn't exist
 */
export async function fetchUser(client: Client, userId: string, options?: FetchUserOptions): Promise<User> {
    const Throw = options?.throwAs ?? UserNotFound;

    let user = client.users.cache.get(userId);
    user ??= await client.users.fetch(userId).catch((err) => {
        if (err instanceof DiscordAPIError && err.code === RESTJSONErrorCodes.UnknownUser) {
            throw new Throw(userId);
        }

        throw err;
    });

    return user;
}
