import { fetchGuildMember } from './fetchGuildMember';

import type { Guild, GuildMember } from 'discord.js';

/**
 * Fetches multiple guild members by user IDs.
 *
 * @param guild - The guild to fetch members from
 * @param userIds - Array of Discord user IDs
 * @returns Promise resolving to array of successfully fetched members
 */
export async function fetchManyGuildMembers(guild: Guild, userIds: string[]): Promise<GuildMember[]> {
    const results = await Promise.allSettled(userIds.map((userId) => fetchGuildMember(guild, userId)));

    return results
        .filter((result): result is PromiseFulfilledResult<GuildMember> => result.status === 'fulfilled')
        .map((result) => result.value);
}
