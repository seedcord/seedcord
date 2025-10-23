import { Guild } from 'discord.js';

import { RoleDoesNotExist } from '../../errors/Roles';

import type { Nullable } from '@seedcord/types';
import type { Client, Role } from 'discord.js';

/**
 * Fetches a role by ID from a client or guild.
 *
 * @param clientOrGuild - Discord client or guild instance
 * @param roleId - The role ID to fetch
 * @returns Promise resolving to the role
 * @throws A {@link RoleDoesNotExist} When the role doesn't exist
 */
export async function fetchRole(clientOrGuild: Client | Guild, roleId: string): Promise<Role> {
    let role: Nullable<Role>;

    if (!roleId) {
        throw new RoleDoesNotExist('Role ID is null or undefined', roleId);
    }

    if (clientOrGuild instanceof Guild) {
        const guild = clientOrGuild;

        role = guild.roles.cache.get(roleId);

        if (!role) {
            try {
                role = await guild.roles.fetch(roleId);
            } catch {
                throw new RoleDoesNotExist('Role not found in specified guild', roleId);
            }
        }
    } else {
        const client = clientOrGuild;

        role = client.guilds.cache.map((guild) => guild.roles.cache.get(roleId)).find((role) => role);

        if (!role) {
            const guilds = client.guilds.cache;
            for (const guild of guilds.values()) {
                try {
                    role = await guild.roles.fetch(roleId);
                    if (role) break;
                } catch {
                    continue;
                }
            }
        }
    }

    if (!role) {
        throw new RoleDoesNotExist('Role not found', roleId);
    }

    return role;
}
