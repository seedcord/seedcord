import { assertPermissions } from '@seedcord/core';

import { mentionFor } from '#bot/notices/utils';

import type { PermissionNoticeConstructor, PermissionScope } from '@seedcord/core';
import type { GuildBasedChannel, GuildMember, Role } from 'discord.js';

/** Options for {@link checkPermissions}. */
export interface CheckPermissionOptions {
    /** The role or member to check. */
    for: Role | GuildMember;
    /** A channel or thread, to read the set after its overwrites. Leave it out to read the base set from roles. */
    in?: GuildBasedChannel | undefined;
    /** The permission flag bits to check. */
    scope: PermissionScope;
    /** Refuse when the target holds a scope bit. */
    inverse?: boolean;
    /** Your Notice class, thrown in place of the default refusal. seedcord constructs it with the target's mention and the refused names. */
    notice?: PermissionNoticeConstructor | undefined;
}

/**
 * Checks a {@link Role} or a {@link GuildMember} against the base permission set from roles, or against a
 * channel's set when `in` is given. Refuses when a permission in `scope` is missing, or with `inverse` when
 * one is present.
 *
 * @throws A {@link Notice} when the check refuses. It lists the missing or present permissions.
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import { checkPermissions } from '@seedcord/gateway';
 *
 * checkPermissions({ for: member, scope: [PermissionFlagsBits.KickMembers] });
 * checkPermissions({ for: role, in: channel, scope: [PermissionFlagsBits.SendMessages] });
 * ```
 *
 * @example
 * ```ts
 * // refuse when the member holds Administrator, with your own Notice class
 * checkPermissions({ for: member, scope: [PermissionFlagsBits.Administrator], inverse: true, notice: TooPowerful });
 * ```
 */
export function checkPermissions({
    for: target,
    in: channel,
    scope,
    inverse = false,
    notice
}: CheckPermissionOptions): void {
    const held = channel ? channel.permissionsFor(target, true) : target.permissions;
    assertPermissions({
        subject: mentionFor(target),
        permissions: held.bitfield,
        scope,
        inverse,
        notice
    });
}
