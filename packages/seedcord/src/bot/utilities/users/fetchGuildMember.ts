import { Notice } from '@seedcord/kit';
import { NoticeCard } from '@seedcord/kit/internal';
import { DiscordAPIError, RESTJSONErrorCodes } from 'discord.js';

import type { ReplyResponse } from '@seedcord/types';
import type { Guild, GuildMember } from 'discord.js';

/**
 * Error thrown when attempting to perform actions on a user not in the guild.
 */
class UserNotInGuild extends Notice {
    constructor(message = 'User is not in the guild.') {
        super(message);
    }

    render(): ReplyResponse {
        const card = new NoticeCard(this.message);
        return { components: [card.component] };
    }
}

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
    user ??= await guild.members.fetch(userId).catch((err) => {
        if (err instanceof DiscordAPIError && err.code === RESTJSONErrorCodes.UnknownMember) {
            throw new UserNotInGuild(`User with ID ${userId} not found in guild`);
        }

        throw err;
    });

    return user;
}
