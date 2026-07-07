import { DiscordAPIError, RESTJSONErrorCodes } from 'discord.js';

import { UserNotFound } from '@bot/notices';

import type { Notice } from '@seedcord/core';
import type { Client, User } from 'discord.js';

/**
 * Options for {@link fetchUser}.
 */
export interface FetchUserOptions {
    /** Notice shown when the user does not exist, defaulting to the standard user-not-found notice. */
    throwAs?: new (userArg: string) => Notice;
}

/**
 * Fetches a Discord user by ID. Refuses when the user doesn't exist, with `options.throwAs` or the default.
 *
 * @param client - The Discord client instance
 * @param userId - The Discord user ID
 * @param options - Optional overrides, including the {@link FetchUserOptions.throwAs} notice
 * @returns Promise resolving to the user
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
