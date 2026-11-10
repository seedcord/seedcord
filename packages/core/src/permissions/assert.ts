import { HasPresentPermissions, MissingPermissions } from '#notices/index';

import { missingNames, presentNames } from './bits';

import type { NoticeConstructor } from '#stops/Notice';
import type { PermissionScope } from './bits';

/**
 * A Notice class for a permission refusal. seedcord constructs it with the subject and the permission names
 * listed in the refusal. A null subject is the caller.
 */
export type PermissionNoticeConstructor = NoticeConstructor<[subject: string | null, permissions: readonly string[]]>;

/** The check {@link assertPermissions} runs. */
export interface PermissionAssertion {
    /** Mention string for who is checked, used as the refusal's subject. Null addresses the caller. */
    subject: string | null;
    /** The effective permission bitfield the subject holds, computed by the caller. */
    permissions: bigint;
    /** The permission flag bits to check. */
    scope: PermissionScope;
    /** Refuse when the subject holds a scope bit. */
    inverse?: boolean;
    /** Your Notice class, thrown in place of the default refusal. seedcord constructs it with the missing names, or the held ones under `inverse`. */
    notice?: PermissionNoticeConstructor | undefined;
}

/**
 * Refuses when the subject is missing a permission in `scope`, or with `inverse` when it holds one.
 * The Administrator bit passes any scope, and with `inverse` it reports every bit in `scope`.
 *
 * The caller computes `permissions`, gateway off a discord.js role, member, or channel, and HTTP off the
 * bitfield in the interaction payload.
 *
 * @throws A {@link Notice} when the check refuses. It lists the missing or present permissions.
 *
 * @example
 * ```ts
 * import { assertPermissions } from '@seedcord/core';
 * import { PermissionFlagsBits } from 'discord-api-types/v10';
 *
 * // gateway, the bits come off a discord.js member
 * assertPermissions({
 *     subject: `<@${member.id}>`,
 *     permissions: member.permissions.bitfield,
 *     scope: [PermissionFlagsBits.BanMembers]
 * });
 * ```
 *
 * @example
 * ```ts
 * // HTTP, the payload carries the member's bits as a string
 * assertPermissions({
 *     subject: `<@${this.event.member.user.id}>`,
 *     permissions: BigInt(this.event.member.permissions),
 *     scope: [PermissionFlagsBits.ManageMessages]
 * });
 * ```
 *
 * @example
 * ```ts
 * // inverse, refuse a role that carries Administrator
 * assertPermissions({
 *     subject: `<@&${role.id}>`,
 *     permissions: role.permissions.bitfield,
 *     scope: [PermissionFlagsBits.Administrator],
 *     inverse: true
 * });
 * ```
 *
 * @example
 * ```ts
 * import { Notice } from '@seedcord/core';
 *
 * class CannotBan extends Notice {
 *     public constructor(
 *         private readonly subject: string | null,
 *         private readonly missing: readonly string[]
 *     ) {
 *         super('You cannot ban here.');
 *     }
 *
 *     public render(): ReplyResponse {
 *         return { components: [new BanDenied(this.subject, this.missing).component] };
 *     }
 * }
 *
 * assertPermissions({
 *     subject: `<@${member.id}>`,
 *     permissions: member.permissions.bitfield,
 *     scope: [PermissionFlagsBits.BanMembers],
 *     notice: CannotBan
 * });
 * ```
 */
export function assertPermissions({ subject, permissions, scope, inverse = false, notice }: PermissionAssertion): void {
    const [refused, Default] = inverse
        ? [presentNames(permissions, scope), HasPresentPermissions]
        : [missingNames(permissions, scope), MissingPermissions];
    if (refused.length === 0) return;
    throw new (notice ?? Default)(subject, refused);
}
