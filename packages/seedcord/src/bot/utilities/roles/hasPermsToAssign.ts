import { PermissionFlagsBits, type Guild, type GuildMember, type Role, type TextChannel } from 'discord.js';

import { CannotAssignBotRole, MissingPermissions, RoleHigherThanMe } from '@bErrors/Roles';

import { getBotRole } from './getBotRole';
import { checkBotPermissions } from '../permissions/checkBotPermissions';

import type { CustomError } from '@interfaces/Components';

/**
 * Optional custom error constructors for assignment checks.
 */
export interface AssignRoleErrorCtors {
    /** Custom error for role higher than bot */
    higher?: new (message: string, role: Role, botRole: Role) => CustomError;
    /** Custom error for managed role assignment */
    managed?: new (message: string) => CustomError;
    /** Custom error for missing Manage Roles permission */
    missing?: new (
        message: string,
        where: Role | TextChannel | Guild | GuildMember,
        missingPerms: string[]
    ) => CustomError;
}

/**
 * Options for role assignment permission checks.
 */
export interface HasPermsToAssignOptions {
    /** Target role to validate for assignment */
    targetRole: Role;
    /** Optional custom error constructors */
    errors?: AssignRoleErrorCtors;
}

/**
 * Validates if the bot can assign a target role. Checks for role hierarchy, managed status, and Manage Roles permission.
 *
 * @param roleOrOptions - Target role or complete options for the check
 * @throws A {@link RoleHigherThanMe} When the target role is higher than the bot role
 * @throws A {@link CannotAssignBotRole} When the target role is managed
 * @throws A {@link MissingPermissions} When the bot lacks Manage Roles permission
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
        roleOrOptions instanceof Object && 'id' in roleOrOptions
            ? { targetRole: roleOrOptions, errors: undefined }
            : roleOrOptions;

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
