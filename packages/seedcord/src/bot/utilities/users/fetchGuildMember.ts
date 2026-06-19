import { DiscordAPIError, RESTJSONErrorCodes } from 'discord.js';

import { UserNotInGuild } from '@bot/notices';

import type { Guild, GuildMember } from 'discord.js';

/**
 * Fetches a guild member by user ID. Refuses when the user is not in the guild.
 *
 * @param guild - The guild to fetch the member from
 * @param userId - The Discord user ID
 * @returns Promise resolving to the guild member
 */
export async function fetchGuildMember(guild: Guild, userId: string): Promise<GuildMember> {
    let user = guild.members.cache.get(userId);
    user ??= await guild.members.fetch(userId).catch((err) => {
        if (err instanceof DiscordAPIError && err.code === RESTJSONErrorCodes.UnknownMember) {
            throw new UserNotInGuild(`User with ID ${userId} not found in guild`);
        }

        throw err;
    });

    return user;
}
