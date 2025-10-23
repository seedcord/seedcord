import { UserNotInGuild } from '../../errors/User';

import type { Guild, GuildMember } from 'discord.js';

/**
 * Fetches a guild member by user ID with error handling.
 *
 * @param guild - The guild to fetch the member from
 * @param userId - The Discord user ID
 * @returns Promise resolving to the guild member
 * @throws A {@link UserNotInGuild} When the user is not found in the guild
 */
export async function fetchGuildMember(guild: Guild, userId: string): Promise<GuildMember> {
    let user = guild.members.cache.get(userId);
    user ??= await guild.members.fetch(userId).catch(() => {
        throw new UserNotInGuild(`User with ID ${userId} not found in guild`);
    });

    return user;
}
