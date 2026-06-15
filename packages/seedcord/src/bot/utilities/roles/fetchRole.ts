import { Notice } from '@seedcord/kit';
import { NoticeEmbed } from '@seedcord/kit/internal';
import { DiscordAPIError, Guild, RESTJSONErrorCodes } from 'discord.js';

import type { Nullable, ReplyResponse } from '@seedcord/types';
import type { Client, Role } from 'discord.js';

/**
 * Error thrown when a requested role does not exist.
 */
class RoleDoesNotExist extends Notice {
    constructor(
        message: string,
        public roleId: string
    ) {
        super(message);
    }

    render(): ReplyResponse {
        const embed = new NoticeEmbed(`The role with ID \`${this.roleId}\` does not exist.`);
        return { kind: 'embed', embeds: [embed.component] };
    }
}

function isUnknownRole(err: unknown): boolean {
    return err instanceof DiscordAPIError && err.code === RESTJSONErrorCodes.UnknownRole;
}

async function fetchRoleInGuild(guild: Guild, roleId: string): Promise<Nullable<Role>> {
    const cached = guild.roles.cache.get(roleId);
    if (cached) return cached;

    try {
        return await guild.roles.fetch(roleId);
    } catch (err) {
        if (isUnknownRole(err)) {
            throw new RoleDoesNotExist('Role not found in specified guild', roleId);
        }

        throw err;
    }
}

async function scanGuildsForRole(client: Client, roleId: string): Promise<Nullable<Role>> {
    const cached = client.guilds.cache.map((guild) => guild.roles.cache.get(roleId)).find((role) => role);
    if (cached) return cached;

    for (const guild of client.guilds.cache.values()) {
        try {
            const role = await guild.roles.fetch(roleId);
            if (role) return role;
        } catch (err) {
            // A role id is unique to one guild, so "unknown role" just means "not this one"; keep
            // scanning. Surface anything else (rate limits, permissions, outages).
            if (isUnknownRole(err)) continue;

            throw err;
        }
    }

    return null;
}

/**
 * Fetches a role by ID from a client or guild.
 *
 * @param clientOrGuild - Discord client or guild instance
 * @param roleId - The role ID to fetch
 * @returns Promise resolving to the role
 * @throws A {@link RoleDoesNotExist} When the role doesn't exist
 */
export async function fetchRole(clientOrGuild: Client | Guild, roleId: string): Promise<Role> {
    if (!roleId) {
        throw new RoleDoesNotExist('Role ID is null or undefined', roleId);
    }

    const role =
        clientOrGuild instanceof Guild
            ? await fetchRoleInGuild(clientOrGuild, roleId)
            : await scanGuildsForRole(clientOrGuild, roleId);

    if (!role) {
        throw new RoleDoesNotExist('Role not found', roleId);
    }

    return role;
}
