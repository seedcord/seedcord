import { DiscordAPIError, RESTJSONErrorCodes } from 'discord.js';

import { UserNotFound } from '../../errors/User';

import type { Client, User } from 'discord.js';

/**
 * Fetches a Discord user by ID with error handling.
 *
 * @param client - The Discord client instance
 * @param userId - The Discord user ID
 * @returns Promise resolving to the user
 * @throws A {@link UserNotFound} When the user doesn't exist
 */
export async function fetchUser(client: Client, userId: string): Promise<User> {
    let user = client.users.cache.get(userId);
    user ??= await client.users.fetch(userId).catch((err) => {
        if (err instanceof DiscordAPIError && err.code === RESTJSONErrorCodes.UnknownUser) {
            throw new UserNotFound(userId);
        }

        throw err;
    });

    return user;
}
