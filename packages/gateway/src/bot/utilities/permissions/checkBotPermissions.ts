import { MissingPermissions, PermissionNames } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { Guild } from 'discord.js';

import { checkPermissions } from './checkPermissions';

import type { PermissionErrorNoticeOverrides } from './checkPermissions';
import type { PermissionScope } from '@seedcord/core';
import type { TextChannel } from 'discord.js';

/**
 * Checks if the bot has required permissions in a {@link Guild} or {@link TextChannel}. Refuses when a
 * required permission is missing.
 *
 * @param target - Guild or text channel to check in
 * @param scope - Permission bits to validate
 * @param inverse - Whether to check for absence of the given permissions
 * @param errors - Optional custom error constructors
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import { checkBotPermissions } from '@seedcord/gateway';
 *
 * // Check if the bot has SendMessages and ViewChannel permissions in a text channel
 * checkBotPermissions(textChannel, [
 *   PermissionFlagsBits.SendMessages,
 *   PermissionFlagsBits.ViewChannel
 * ]);
 * ```
 */
export function checkBotPermissions(
    target: Guild | TextChannel,
    scope: PermissionScope,
    inverse = false,
    errors?: PermissionErrorNoticeOverrides
): void {
    if (target instanceof Guild) {
        const me = target.members.me;
        if (!me) {
            const names = scope.map((bit) => PermissionNames.get(bit) ?? String(bit));
            const Missing = errors?.missingNotice ?? MissingPermissions;
            throw new Missing(undefined, 'The bot', names);
        }
        checkPermissions(me, target, scope, inverse, errors);
        return;
    }

    const me = target.guild.members.me;

    if (!me) {
        const logger = new Logger('checkBotPermissions', { channel: 'errors' });
        logger.warn(
            `Bot member is unavailable in guild ${target.guild.id} while checking permissions in channel ${target.id}`
        );
        const names = scope.map((bit) => PermissionNames.get(bit) ?? String(bit));
        const Missing = errors?.missingNotice ?? MissingPermissions;
        throw new Missing(undefined, 'The bot', names);
    }

    checkPermissions(me, target, scope, inverse, errors);
}
