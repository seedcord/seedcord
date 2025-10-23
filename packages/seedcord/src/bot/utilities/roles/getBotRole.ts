import type { Client, Guild, Role } from 'discord.js';

/**
 * Gets the bot's highest role in a guild.
 *
 * @param client - The Discord client instance
 * @param guild - The guild to get the bot's role from
 * @returns The bot's highest role in the guild
 * @throws An {@link Error} When the bot is not in the guild
 */
export function getBotRole(client: Client, guild: Guild): Role {
    if (!client.user) throw new Error('Client user is not available'); // TODO: Use custom error

    const botRole = guild.roles.botRoleFor(client.user);
    if (!botRole) throw new Error('Bot role not found in guild'); // TODO: Use custom error

    return botRole;
}
