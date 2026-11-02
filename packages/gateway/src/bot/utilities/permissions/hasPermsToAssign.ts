import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { PermissionFlagsBits } from 'discord.js';

import { CannotAssignBotRole, RoleHigherThanMe } from '#bot/notices';

import { checkBotPermissions } from './checkBotPermissions';

import type { NoticeConstructor, PermissionNoticeConstructor } from '@seedcord/core';
import type { Guild, Role } from 'discord.js';

/** Options for {@link hasPermsToAssign}. */
export interface HasPermsToAssignOptions {
    /** The role the bot would assign. */
    role: Role;
    /** Your Notice class, constructed with both roles and thrown in place of the refusal when the role is at or above the bot's. */
    higher?: NoticeConstructor<[role: Role, botRole: Role]>;
    /** Your Notice class, constructed with the role and thrown in place of the refusal when an integration manages the role. */
    managed?: NoticeConstructor<[role: Role]>;
    /** Your Notice class, thrown when the bot lacks Manage Roles. seedcord constructs it with the bot's mention and that permission's name. */
    missing?: PermissionNoticeConstructor;
}

// botRoleFor searches the guild's role cache, so a cold cache returns null
function botRoleOf(guild: Guild): Role {
    const botRole = guild.roles.botRoleFor(guild.client.user);
    if (!botRole) throw new SeedcordError(SeedcordErrorCode.CoreBotRoleMissing, [guild.id]);
    return botRole;
}

/**
 * Validates that the bot can assign a role. Refuses when the role is at or above the bot's, when an
 * integration manages it, or when the bot lacks Manage Roles.
 *
 * @throws A {@link Notice} when the check refuses.
 * @throws A **SeedcordError** when the guild's caches don't hold the bot's role or member.
 *
 * @example
 * ```ts
 * import { hasPermsToAssign } from '@seedcord/gateway';
 *
 * hasPermsToAssign({ role });
 *
 * // with your own Notice classes
 * hasPermsToAssign({ role, higher: RoleTooHigh, managed: RoleIsManaged, missing: CannotManageRoles });
 * ```
 */
export function hasPermsToAssign({ role, higher, managed, missing }: HasPermsToAssignOptions): void {
    const botRole = botRoleOf(role.guild);
    if (role.comparePositionTo(botRole) >= 0) throw new (higher ?? RoleHigherThanMe)(role, botRole);
    if (role.managed) throw new (managed ?? CannotAssignBotRole)(role);
    checkBotPermissions({
        in: role.guild,
        scope: [PermissionFlagsBits.ManageRoles],
        notice: missing
    });
}
