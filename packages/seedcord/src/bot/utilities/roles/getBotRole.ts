import { SeedcordError, SeedcordErrorCode } from '@seedcord/services';

import type { Client, Guild, Role } from 'discord.js';

/**
 * Gets the bot's highest role in a guild.
 *
 * @param client - The Discord client instance
 * @param guild - The guild to get the bot's role from
 * @returns The bot's highest role in the guild
 * @throws A {@link SeedcordError} When the bot is not in the guild
 */
export function getBotRole(client: Client, guild: Guild): Role {
    if (!client.user) {
        throw new SeedcordError(SeedcordErrorCode.CoreClientUserUnavailable);
    }

    const botRole = guild.roles.botRoleFor(client.user);
    if (!botRole) {
        throw new SeedcordError(SeedcordErrorCode.CoreBotRoleMissing, [guild.id]);
    }

    return botRole;
}
