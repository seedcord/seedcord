import { MissingPermissions, PermissionNames } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { Guild } from 'discord.js';

import { checkPermissions } from './checkPermissions';

import type { PermissionNoticeOverrides, PermissionScope } from '@seedcord/core';
import type { TextChannel } from 'discord.js';

/**
 * Checks the bot's own permissions in a {@link Guild} or {@link TextChannel}. Refuses when a permission in
 * `scope` is missing, or with `inverse` when one is present. When the bot member is uncached, the refusal
 * reports every permission in `scope` as missing.
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import { checkBotPermissions } from '@seedcord/gateway';
 *
 * checkBotPermissions(textChannel, [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]);
 * ```
 */
export function checkBotPermissions(
    target: Guild | TextChannel,
    scope: PermissionScope,
    inverse = false,
    errors?: PermissionNoticeOverrides
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
