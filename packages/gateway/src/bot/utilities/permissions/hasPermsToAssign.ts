import { MissingPermissions } from '@seedcord/core/internal';
import { PermissionFlagsBits, Role } from 'discord.js';

import { CannotAssignBotRole, RoleHigherThanMe } from '@bot/notices';

import { checkBotPermissions } from './checkBotPermissions';
import { getBotRole } from '../roles/getBotRole';

import type { Notice } from '@seedcord/core';

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

/**
 * Validates if the bot can assign a target role. Refuses when the target role is above the bot's, is managed, or the bot lacks Manage Roles.
 *
 * @param roleOrOptions - Target role or complete options for the check
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

    const botRole = getBotRole(targetRole.guild);

    if (targetRole.comparePositionTo(botRole) >= 0) {
        throw new HigherNotice('Role is higher than me', targetRole, botRole);
    }

    if (targetRole.managed) {
        throw new ManagedNotice(`Cannot assign managed role ${targetRole.name}`);
    }

    checkBotPermissions(targetRole.guild, [PermissionFlagsBits.ManageRoles], false, { missingNotice: MissingNotice });
}
