import { PermissionFlagsBits } from 'discord.js';

import { RoleHigherThanMe, CannotAssignBotRole } from '@bErrors/Roles';

import { getBotRole } from './getBotRole';
import { checkBotPermissions } from '../permissions/checkBotPermissions';

import type { Role } from 'discord.js';

/**
 * Validates if the bot has permission to assign a target role.
 *
 * @param targetRole - The role to check assignment permissions for
 * @throws A {@link RoleHigherThanMe} When the target role is higher than bot's role
 * @throws A {@link CannotAssignBotRole} When trying to assign a managed/bot role
 * @throws A {@link MissingPermissions} When bot lacks Manage Roles permission
 */
export function hasPermsToAssign(targetRole: Role): void {
    const botRole = getBotRole(targetRole.client, targetRole.guild);

    if (targetRole.comparePositionTo(botRole) >= 0) {
        throw new RoleHigherThanMe('Role is higher than me', targetRole, botRole);
    }

    if (targetRole.managed) {
        throw new CannotAssignBotRole(`Cannot assign bot role ${targetRole.name}`);
    }

    checkBotPermissions(targetRole.client, targetRole.guild, [PermissionFlagsBits.ManageRoles]);
}
