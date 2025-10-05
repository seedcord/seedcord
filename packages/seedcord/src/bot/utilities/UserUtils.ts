import {
    DiscordAPIError,
    RESTJSONErrorCodes,
    type Client,
    type Guild,
    type GuildMember,
    type Snowflake,
    type User
} from 'discord.js';

import { UserNotFound, UserNotInGuild } from '../errors/User';

/**
 * Utility functions for Discord user and member operations.
 */
export class UserUtils {
    /**
     * Fetches a guild member by user ID with error handling.
     *
     * @param guild - The guild to fetch the member from
     * @param userId - The Discord user ID
     * @returns Promise resolving to the guild member
     * @throws A {@link UserNotInGuild} When the user is not found in the guild
     */
    public static async fetchGuildMember(guild: Guild, userId: string): Promise<GuildMember> {
        let user = guild.members.cache.get(userId);
        user ??= await guild.members.fetch(userId).catch(() => {
            throw new UserNotInGuild(`User with ID ${userId} not found in guild`);
        });

        return user;
    }

    /**
     * Fetches a Discord user by ID with error handling.
     *
     * @param client - The Discord client instance
     * @param userId - The Discord user ID
     * @returns Promise resolving to the user
     * @throws A {@link UserNotFound} When the user doesn't exist
     */
    public static async fetchUser(client: Client, userId: string): Promise<User> {
        let user = client.users.cache.get(userId);
        user ??= await client.users.fetch(userId).catch((err) => {
            if (err instanceof DiscordAPIError && err.code === RESTJSONErrorCodes.UnknownUser) {
                throw new UserNotFound(userId);
            }

            throw err;
        });

        return user;
    }

    /**
     * Fetches multiple guild members by user IDs.
     *
     * @param guild - The guild to fetch members from
     * @param userIds - Array of Discord user IDs
     * @returns Promise resolving to array of successfully fetched members
     */
    public static async fetchManyGuildMembers(guild: Guild, userIds: string[]): Promise<GuildMember[]> {
        const results = await Promise.allSettled(userIds.map((userId) => UserUtils.fetchGuildMember(guild, userId)));

        return results
            .filter((result): result is PromiseFulfilledResult<GuildMember> => result.status === 'fulfilled')
            .map((result) => result.value);
    }

    /**
     * Fetches multiple Discord users by IDs.
     *
     * @param client - The Discord client instance
     * @param userIds - Array of Discord user IDs
     * @returns Promise resolving to array of successfully fetched users
     */
    public static async fetchManyUsers(client: Client, userIds: string[]): Promise<User[]> {
        const results = await Promise.allSettled(userIds.map((userId) => UserUtils.fetchUser(client, userId)));

        return results
            .filter((result): result is PromiseFulfilledResult<User> => result.status === 'fulfilled')
            .map((result) => result.value);
    }

    /**
     * Updates a guild member's roles by adding and removing specified roles.
     *
     * @param rolesToAdd - Array of role IDs to add to the member
     * @param rolesToRemove - Array of role IDs to remove from the member
     * @param member - The guild member to update
     * @returns Promise that resolves when roles are updated
     */
    public static async updateMemberRoles(
        rolesToAdd: Snowflake[],
        rolesToRemove: Snowflake[],
        member: GuildMember
    ): Promise<void> {
        const current = new Set(member.roles.cache.map((r) => r.id));
        const toAdd = new Set(rolesToAdd);
        const toRemove = new Set(rolesToRemove);
        const updated = current.union(toAdd).difference(toRemove);

        await member.roles.set([...updated]);
    }
}
