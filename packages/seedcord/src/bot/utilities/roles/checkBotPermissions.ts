import { Guild } from 'discord.js';

import { checkPermissions } from './checkPermissions';
import { getBotRole } from './getBotRole';

import type { BotPermissionScope } from './checkPermissions';
import type { Client, TextChannel } from 'discord.js';

/**
 * Checks if the bot has required permissions in a guild or channel.
 *
 * @param client - The Discord client instance
 * @param guildOrChannel - Guild or text channel to check permissions in
 * @param scope - Permission scope to validate
 * @param inverse - Whether to check for absence of permissions
 * @throws A {@link MissingPermissions} When bot lacks required permissions
 */
export function checkBotPermissions(
    client: Client,
    guildOrChannel: Guild | TextChannel,
    scope: BotPermissionScope = 'all',
    inverse = false
): void {
    if (guildOrChannel instanceof Guild) {
        const botRole = getBotRole(client, guildOrChannel);
        checkPermissions(client, botRole, scope, inverse);
    } else {
        checkPermissions(client, guildOrChannel, scope);
    }
}
