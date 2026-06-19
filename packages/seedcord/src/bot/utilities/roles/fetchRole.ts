import { DiscordAPIError, Guild, RESTJSONErrorCodes } from 'discord.js';

import { RoleDoesNotExist } from '@bot/notices';

import type { Nullable } from '@seedcord/types';
import type { Client, Role } from 'discord.js';

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
 * Fetches a role by ID from a client or guild. Refuses when the role doesn't exist.
 *
 * @param clientOrGuild - Discord client or guild instance
 * @param roleId - The role ID to fetch
 * @returns Promise resolving to the role
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
