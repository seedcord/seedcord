import { MissingPermissions, PermissionNames } from '@seedcord/core/internal';
import { Guild, GuildMember, Role } from 'discord.js';

import { HasDangerousPermissions } from '@bot/notices';
import { mentionFor } from '@bot/notices/utils';

import type { Notice, PermissionScope } from '@seedcord/core';
import type { PermissionsBitField, TextChannel } from 'discord.js';

/**
 * Optional custom error constructors for {@link CheckPermissionOptions}.
 */
export interface PermissionErrorNoticeOverrides {
    missingNotice?: new (message: string | undefined, subject: string, missingPerms: readonly string[]) => Notice;
    dangerousNotice?: new (message: string | undefined, subject: string, dangerousPerms: readonly string[]) => Notice;
}

/**
 * Options for {@link checkPermissions}.
 *
 * @see {@link PermissionErrorNoticeOverrides}
 */
export interface CheckPermissionOptions extends PermissionErrorNoticeOverrides {
    /** Role or member whose permissions will be checked */
    for: Role | GuildMember;
    /** Context where permissions apply */
    in: Guild | TextChannel;
    /** Permission bits to validate */
    scope: PermissionScope;
    /** When true, ensure target does NOT have the given permissions */
    inverse?: boolean;
}

/**
 * Checks permissions for a {@link Role} or a {@link GuildMember} in a {@link Guild}. Refuses when a
 * permission in `scope` is missing, or with `inverse` when one is present.
 *
 * @param target - Role or member to check
 * @param ctx - Guild context
 * @param scope - Permission bits to validate
 * @param inverse - Whether to ensure absence of the given permissions
 * @param errors - Optional custom error constructors
 *
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import { checkPermissions } from '@seedcord/gateway';
 *
 * // Check if a role has ManageMessages and KickMembers permissions in a guild
 * checkPermissions(role, guild, [
 *   PermissionFlagsBits.ManageMessages,
 *   PermissionFlagsBits.KickMembers
 * ]);
 * ```
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import { checkPermissions } from '@seedcord/gateway';
 *
 * // Ensure a member does NOT have Administrator permission in a guild and show custom errors
 * checkPermissions(member, guild, [
 *   PermissionFlagsBits.Administrator
 * ], true, {
 *   missing: CustomMissingPermissionsError,
 *   dangerous: CustomDangerousPermissionsError
 * });
 * ```
 */
export function checkPermissions(
    target: Role | GuildMember,
    ctx: Guild,
    scope: PermissionScope,
    inverse?: boolean,
    errors?: PermissionErrorNoticeOverrides
): void;

/**
 * Checks permissions for a {@link Role} or a {@link GuildMember} in a {@link TextChannel}. Refuses when a
 * permission in `scope` is missing, or with `inverse` when one is present.
 *
 * @param target - Role or member to check
 * @param ctx - Channel context
 * @param scope - Permission bits to validate
 * @param inverse - Whether to ensure absence of the given permissions
 * @param errors - Optional custom error constructors
 *
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import { checkPermissions } from '@seedcord/gateway';
 *
 * // Check if a role has SendMessages and ViewChannel permissions in a text channel
 * checkPermissions(role, textChannel, [
 *   PermissionFlagsBits.SendMessages,
 *   PermissionFlagsBits.ViewChannel
 * ]);
 * ```
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import { checkPermissions } from '@seedcord/gateway';
 *
 * // Ensure a member does NOT have ManageChannels permission in a text channel and show custom errors
 * checkPermissions(member, textChannel, [
 *   PermissionFlagsBits.ManageChannels
 * ], true, {
 *   missing: CustomMissingPermissionsError,
 *   dangerous: CustomDangerousPermissionsError
 * });
 * ```
 */
export function checkPermissions(
    target: Role | GuildMember,
    // eslint-disable-next-line @typescript-eslint/unified-signatures
    ctx: TextChannel,
    scope: PermissionScope,
    inverse?: boolean,
    errors?: PermissionErrorNoticeOverrides
): void;

/**
 * Checks permissions using an options object. Refuses when a permission in {@link CheckPermissionOptions.scope} is missing,
 * or with `options.inverse` when one is present.
 *
 * @param options - Complete options for the check
 *
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import { checkPermissions } from '@seedcord/gateway';
 *
 * // Check permissions using an options object
 * checkPermissions({
 *   for: member,
 *   in: textChannel,
 *   scope: [
 *     PermissionFlagsBits.SendMessages,
 *     PermissionFlagsBits.ViewChannel
 *   ]
 * });
 * ```
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import { checkPermissions } from '@seedcord/gateway';
 *
 * // Ensure a role does NOT have BanMembers permission in a guild using an options object
 * checkPermissions({
 *   for: role,
 *   in: guild,
 *   scope: [
 *     PermissionFlagsBits.BanMembers
 *   ],
 *   inverse: true,
 *   missing: CustomMissingPermissionsError,
 *   dangerous: CustomDangerousPermissionsError
 * });
 * ```
 */
export function checkPermissions(options: CheckPermissionOptions): void;

export function checkPermissions(
    a: Role | GuildMember | CheckPermissionOptions,
    b?: Guild | TextChannel,
    c?: PermissionScope,
    d?: boolean,
    e?: PermissionErrorNoticeOverrides
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

    const {
        for: pFor,
        in: pIn,
        scope,
        inverse = false,
        missingNotice: missingCtor,
        dangerousNotice: dangerousCtor
    } = opts;

    const Missing = missingCtor ?? MissingPermissions;
    const Dangerous = dangerousCtor ?? HasDangerousPermissions;

    // pIn is the guild or channel where the check ran
    const subject = mentionFor(pFor);

    const perms: Readonly<PermissionsBitField> =
        pIn instanceof Guild ? pFor.permissions : pIn.permissionsFor(pFor, true);

    const names = (bits: readonly bigint[]): string[] => bits.map((bit) => PermissionNames.get(bit) ?? String(bit));

    if (inverse) {
        const present = scope.filter((bit) => perms.has(bit, true));
        if (present.length > 0) throw new Dangerous(undefined, subject, names(present));
        return;
    }

    const missingBits = scope.filter((bit) => !perms.has(bit, true));
    if (missingBits.length > 0) {
        throw new Missing(undefined, subject, names(missingBits));
    }
}
