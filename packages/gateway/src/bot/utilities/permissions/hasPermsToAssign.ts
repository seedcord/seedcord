import { MissingPermissions } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { PermissionFlagsBits, Role } from 'discord.js';

import { CannotAssignBotRole, RoleHigherThanMe } from '@bot/notices';

import { checkBotPermissions } from './checkBotPermissions';

import type { Notice } from '@seedcord/core';
import type { Guild } from 'discord.js';

/**
 * Optional custom error constructors for {@link HasPermsToAssignOptions}.
 */
export interface AssignRoleNoticeOverrides {
    higherNotice?: new (message: string, role: Role, botRole: Role) => Notice;
    managedNotice?: new (message: string) => Notice;
    missingNotice?: new (message: string | undefined, subject: string, missingPerms: readonly string[]) => Notice;
}

/**
 * Options for {@link hasPermsToAssign}.
 */
export interface HasPermsToAssignOptions {
    targetRole: Role;
    noticeOverrides?: AssignRoleNoticeOverrides;
}

// botRoleFor searches the guild's role cache, so a cold cache returns null
function botRoleOf(guild: Guild): Role {
    const botRole = guild.roles.botRoleFor(guild.client.user);
    if (!botRole) throw new SeedcordError(SeedcordErrorCode.CoreBotRoleMissing, [guild.id]);
    return botRole;
}

/**
 * Validates that the bot can assign a target role. Refuses when the target role is above the bot's, is managed, or the bot lacks Manage Roles.
 *
 * @param roleOrOptions - Target role or complete options for the check
 * @throws A `Notice` on refusal, or a `SeedcordError` when the bot has no role in the guild's role cache.
 *
 * @example
 * ```ts
 * import { hasPermsToAssign } from '@seedcord/gateway';
 *
 * // Check if the bot can assign a specific role
 * hasPermsToAssign(role);
 *
 * // Check with custom error handling
 * hasPermsToAssign({
 *   targetRole: role,
 *   noticeOverrides: {
 *     higherNotice: CustomHigherNotice,
 *     managedNotice: CustomManagedNotice,
 *     missingNotice: CustomMissingPermissionsNotice
 *   }
 * });
 * ```
 */
export function hasPermsToAssign(roleOrOptions: Role | HasPermsToAssignOptions): void {
    const { targetRole, noticeOverrides: errors } =
        roleOrOptions instanceof Role
            ? {
                  targetRole: roleOrOptions,
                  noticeOverrides: undefined
              }
            : roleOrOptions;

    const HigherNotice = errors?.higherNotice ?? RoleHigherThanMe;
    const ManagedNotice = errors?.managedNotice ?? CannotAssignBotRole;
    const MissingNotice = errors?.missingNotice ?? MissingPermissions;

    const botRole = botRoleOf(targetRole.guild);

    if (targetRole.comparePositionTo(botRole) >= 0) {
        throw new HigherNotice('Role is higher than me', targetRole, botRole);
    }

    if (targetRole.managed) {
        throw new ManagedNotice(`Cannot assign managed role ${targetRole.name}`);
    }

    checkBotPermissions(targetRole.guild, [PermissionFlagsBits.ManageRoles], false, { missingNotice: MissingNotice });
}
