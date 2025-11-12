import { SeedcordError, SeedcordErrorCode } from '@seedcord/services';

import type { Guild, Role } from 'discord.js';

/**
 * Gets the bot's managed role in a guild.
 *
 * @param guild - The guild to get the bot role from
 * @returns The bot's managed role in the guild
 * @throws A {@link SeedcordError} if the client user is unavailable or if the bot role is missing
 */
export function getBotRole(guild: Guild): Role {
    const botRole = guild.roles.botRoleFor(guild.client.user);

    if (!botRole) {
        throw new SeedcordError(SeedcordErrorCode.CoreBotRoleMissing, [guild.id]);
    }

    return botRole;
}
