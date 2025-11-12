import { Guild } from 'discord.js';

import { MissingPermissions } from '@bot/defaults/errors/Roles';

import { checkPermissions, PermissionNames } from './checkPermissions';

import type { BotPermissionScope, PermissionErrorCtors } from './checkPermissions';
import type { TextChannel } from 'discord.js';

/**
 * Checks if the bot has required permissions in a {@link Guild} or {@link TextChannel}.
 *
 * @param target - Guild or text channel to check in
 * @param scope - Permission bits to validate
 * @param inverse - Whether to check for absence of the given permissions
 * @param errors - Optional custom error constructors
 * @throws A MissingPermissions error when required permissions are missing
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import { checkBotPermissions } from 'seedcord';
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
    scope: BotPermissionScope,
    inverse = false,
    errors?: PermissionErrorCtors
): void {
    if (target instanceof Guild) {
        const me = target.members.me;
        if (!me) {
            const names = scope.map((bit) => PermissionNames.get(bit) ?? String(bit));
            const Missing = errors?.missing ?? MissingPermissions;
            throw new Missing('Missing Permissions', target, names);
        }
        checkPermissions(me, target, scope, inverse, errors);
        return;
    }

    const me = target.guild.members.me;
    if (!me) {
        const names = scope.map((bit) => PermissionNames.get(bit) ?? String(bit));
        const Missing = errors?.missing ?? MissingPermissions;
        throw new Missing('Missing Permissions', target, names);
    }

    checkPermissions(me, target, scope, inverse, errors);
}

/** Alias for {@link checkBotPermissions} */
export const ensureBotPermissions = checkBotPermissions;
