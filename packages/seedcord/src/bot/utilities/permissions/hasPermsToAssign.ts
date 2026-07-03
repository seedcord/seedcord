import { PermissionFlagsBits, Role, type Guild, type GuildMember, type TextChannel } from 'discord.js';

import { CannotAssignBotRole, MissingPermissions, RoleHigherThanMe } from '@bot/notices';

import { checkBotPermissions } from './checkBotPermissions';
import { getBotRole } from '../roles/getBotRole';

import type { Notice } from '@seedcord/core';

/**
 * Optional custom error constructors for {@link HasPermsToAssignOptions}.
 */
export interface AssignRoleErrorCtors {
    /** Custom error for role higher than bot */
    higher?: new (message: string, role: Role, botRole: Role) => Notice;
    /** Custom error for managed role assignment */
    managed?: new (message: string) => Notice;
    /** Custom error for missing Manage Roles permission */
    missing?: new (message: string, where: Role | TextChannel | Guild | GuildMember, missingPerms: string[]) => Notice;
}

/**
 * Options for {@link hasPermsToAssign}.
 */
export interface HasPermsToAssignOptions {
    /** Target role to validate for assignment */
    targetRole: Role;
    /** Optional custom error constructors */
    errors?: AssignRoleErrorCtors;
}

/**
 * Validates if the bot can assign a target role. Refuses when the target role is above the bot's, is managed, or the bot lacks Manage Roles.
 *
 * @param roleOrOptions - Target role or complete options for the check
 *
 * @example
 * ```ts
 * import { hasPermsToAssign } from 'seedcord';
 *
 * // Check if the bot can assign a specific role
 * hasPermsToAssign(role);
 *
 * // Check with custom error handling
 * hasPermsToAssign({
 *   targetRole: role,
 *   errors: {
 *     higher: CustomHigherError,
 *     managed: CustomManagedError,
 *     missing: CustomMissingPermissionsError
 *   }
 * });
 * ```
 */
export function hasPermsToAssign(roleOrOptions: Role | HasPermsToAssignOptions): void {
    const { targetRole, errors } =
        roleOrOptions instanceof Role ? { targetRole: roleOrOptions, errors: undefined } : roleOrOptions;

    const HigherErr = errors?.higher ?? RoleHigherThanMe;
    const ManagedErr = errors?.managed ?? CannotAssignBotRole;
    const Missing = errors?.missing ?? MissingPermissions;

    const botRole = getBotRole(targetRole.guild);

    if (targetRole.comparePositionTo(botRole) >= 0) {
        throw new HigherErr('Role is higher than me', targetRole, botRole);
    }

    if (targetRole.managed) {
        throw new ManagedErr(`Cannot assign managed role ${targetRole.name}`);
    }

    checkBotPermissions(targetRole.guild, [PermissionFlagsBits.ManageRoles], false, { missing: Missing });
}
