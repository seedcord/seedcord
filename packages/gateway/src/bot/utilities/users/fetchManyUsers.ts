import { fetchUser } from './fetchUser';

import type { FetchUserOptions } from './fetchUser';
import type { Client, User } from 'discord.js';

/**
 * Fetches multiple Discord users by IDs.
 *
 * @param client - The Discord client instance
 * @param userIds - Array of Discord user IDs
 * @param options - Optional overrides threaded to each {@link fetchUser} call
 * @returns Promise resolving to array of successfully fetched users
 */
export async function fetchManyUsers(client: Client, userIds: string[], options?: FetchUserOptions): Promise<User[]> {
    const results = await Promise.allSettled(userIds.map((userId) => fetchUser(client, userId, options)));

    return results
        .filter((result): result is PromiseFulfilledResult<User> => result.status === 'fulfilled')
        .map((result) => result.value);
}
