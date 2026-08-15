import { assertPermissions } from '@seedcord/core';
import { Guild, GuildMember, Role } from 'discord.js';

import { mentionFor } from '#bot/notices/utils';

import type { PermissionNoticeOverrides, PermissionScope } from '@seedcord/core';
import type { TextChannel } from 'discord.js';

/** Options for {@link checkPermissions}. */
export interface CheckPermissionOptions extends PermissionNoticeOverrides {
    /** The role or member to check. */
    for: Role | GuildMember;
    /** A guild reads the base bits from roles, a text channel reads the overwrite-resolved set. */
    in: Guild | TextChannel;
    /** The permission flag bits to check. */
    scope: PermissionScope;
    /** Refuse when the target holds a scope bit. */
    inverse?: boolean;
}

/**
 * Checks a {@link Role} or a {@link GuildMember} against the base permission bits in a {@link Guild},
 * before channel overwrites. Refuses when a permission in `scope` is missing, or with `inverse` when one
 * is present.
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import { checkPermissions } from '@seedcord/gateway';
 *
 * checkPermissions(role, guild, [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers]);
 * ```
 *
 * @example
 * ```ts
 * // refuse when the member holds Administrator, and replace the refusal
 * checkPermissions(member, guild, [PermissionFlagsBits.Administrator], true, {
 *   dangerousNotice: CustomDangerousNotice
 * });
 * ```
 */
export function checkPermissions(
    target: Role | GuildMember,
    ctx: Guild,
    scope: PermissionScope,
    inverse?: boolean,
    errors?: PermissionNoticeOverrides
): void;

/**
 * Checks a {@link Role} or a {@link GuildMember} against the overwrite-resolved set in a
 * {@link TextChannel}. Refuses when a permission in `scope` is missing, or with `inverse` when one is
 * present.
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import { checkPermissions } from '@seedcord/gateway';
 *
 * checkPermissions(role, textChannel, [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]);
 * ```
 */
export function checkPermissions(
    target: Role | GuildMember,
    // eslint-disable-next-line @typescript-eslint/unified-signatures -- the guild and channel forms resolve different bits, documented separately
    ctx: TextChannel,
    scope: PermissionScope,
    inverse?: boolean,
    errors?: PermissionNoticeOverrides
): void;

/**
 * Checks permissions with an options object. Refuses when a permission in
 * {@link CheckPermissionOptions.scope} is missing, or with `options.inverse` when one is present.
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import { checkPermissions } from '@seedcord/gateway';
 *
 * checkPermissions({
 *   for: member,
 *   in: textChannel,
 *   scope: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
 * });
 * ```
 */
export function checkPermissions(options: CheckPermissionOptions): void;

export function checkPermissions(
    a: Role | GuildMember | CheckPermissionOptions,
    b?: Guild | TextChannel,
    c?: PermissionScope,
    d?: boolean,
    e?: PermissionNoticeOverrides
): void {
    const opts: CheckPermissionOptions =
        a instanceof Role || a instanceof GuildMember
            ? // justified: the positional overloads always supply b and c, the implementation signature widens them to | undefined
              {
                  for: a,
                  in: b as Guild | TextChannel,
                  scope: c as PermissionScope,
                  inverse: d ?? false,
                  ...e
              }
            : a;

    const { for: pFor, in: pIn, scope, inverse = false, missingNotice, dangerousNotice } = opts;

    const perms = pIn instanceof Guild ? pFor.permissions : pIn.permissionsFor(pFor, true);

    assertPermissions({
        subject: mentionFor(pFor),
        permissions: perms.bitfield,
        scope,
        inverse,
        ...(missingNotice && { missingNotice }),
        ...(dangerousNotice && { dangerousNotice })
    });
}
