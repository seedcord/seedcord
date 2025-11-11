import { prettify } from '@seedcord/utils';
import { PermissionFlagsBits, Role, Guild, GuildMember } from 'discord.js';

import { HasDangerousPermissions, MissingPermissions } from '@bErrors/Roles';

import type { CustomError } from '@interfaces/Components';
import type { Nullable } from '@seedcord/types';
import type { PermissionsBitField, TextChannel } from 'discord.js';

/**
 * Map of permission bits to their prettified human readable names.
 */
export const PermissionNames = new Map<bigint, string>(
    Object.entries(PermissionFlagsBits).map(([key, bit]) => [bit, prettify(key)])
);

/**
 * Array of permission bits for permission validation.
 * Import any of the predefined sets or pass a custom bigint[].
 */
export type BotPermissionScope = readonly bigint[];

/**
 * Optional custom error constructors.
 * Use to replace the default error classes with your own.
 */
export interface PermissionErrorCtors {
    /* Error thrown when required permissions are missing */
    missing?: new (
        message: string,
        where: Role | TextChannel | Guild | GuildMember,
        missingPerms: string[]
    ) => CustomError;
    /* Error thrown when dangerous permissions are present */
    dangerous?: new (
        message: string,
        target: Role | TextChannel | Guild | GuildMember,
        dangerousPerms: string[]
    ) => CustomError;
}

/**
 * Options for permission checking.
 *
 * @see {@link PermissionErrorCtors}
 */
export interface CheckPermissionOptions extends PermissionErrorCtors {
    /** Role or member whose permissions will be checked */
    for: Role | GuildMember;
    /** Context where permissions apply, guild or channel */
    in: Guild | TextChannel;
    /** Permission bits to validate */
    scope: BotPermissionScope;
    /** When true, ensure target does not have the given permissions */
    inverse?: boolean;
}

/**
 * Checks permissions for a {@link Role} or a {@link GuildMember} in a {@link Guild}.
 *
 * @param target - Role or member to check
 * @param ctx - Guild context
 * @param scope - Permission bits to validate
 * @param inverse - Whether to ensure absence of the given permissions
 * @param errors - Optional custom error constructors
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import { checkPermissions } from 'seedcord';
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
 * import { checkPermissions } from 'seedcord';
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
    scope: BotPermissionScope,
    inverse?: boolean,
    errors?: PermissionErrorCtors
): void;

/**
 * Checks permissions for a {@link Role} or a {@link GuildMember} in a {@link TextChannel}.
 *
 * @param target - Role or member to check
 * @param ctx - Channel context
 * @param scope - Permission bits to validate
 * @param inverse - Whether to ensure absence of the given permissions
 * @param errors - Optional custom error constructors
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import { checkPermissions } from 'seedcord';
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
 * import { checkPermissions } from 'seedcord';
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
    scope: BotPermissionScope,
    inverse?: boolean,
    errors?: PermissionErrorCtors
): void;

/**
 * Checks permissions using an options object.
 *
 * @param options - Complete options for the check
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import { checkPermissions } from 'seedcord';
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
 * import { checkPermissions } from 'seedcord';
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
    c?: BotPermissionScope,
    d?: boolean,
    e?: PermissionErrorCtors
): void {
    const opts: CheckPermissionOptions =
        a instanceof Role || a instanceof GuildMember
            ? {
                  for: a,
                  in: b as Guild | TextChannel,
                  scope: c as BotPermissionScope,
                  inverse: d ?? false,
                  ...(e ?? {})
              }
            : a;

    const { for: pFor, in: pIn, scope, inverse = false, missing: missingCtor, dangerous: dangerousCtor } = opts;

    const Missing = missingCtor ?? MissingPermissions;
    const Dangerous = dangerousCtor ?? HasDangerousPermissions;

    const perms: Nullable<Readonly<PermissionsBitField>> =
        pIn instanceof Guild ? pFor.permissions : pIn.permissionsFor(pFor, true);

    const names = (bits: readonly bigint[]): string[] => bits.map((bit) => PermissionNames.get(bit) ?? String(bit));

    const present = scope.filter((bit) => perms.has(bit, true));
    const presentNames = names(present);

    if (inverse) {
        if (present.length > 0) {
            const base =
                `${pFor instanceof Role ? 'Role' : 'Member'}` +
                ` has dangerous permissions in this` +
                ` ${pIn instanceof Guild ? 'guild' : 'channel'}`;
            throw new Dangerous(base, pFor, presentNames);
        }
        return;
    }

    const missingBits = scope.filter((bit) => !perms.has(bit, true));
    if (missingBits.length > 0) {
        throw new Missing('Missing Any/All/No Permissions', pIn, names(missingBits));
    }
}

/** Alias for {@link checkPermissions} */
export const ensurePermissions = checkPermissions;
