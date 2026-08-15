import { HasDangerousPermissions, MissingPermissions } from '#notices/index';

import { hasAll, missingNames, presentNames } from './bits';

import type { Notice } from '#stops/Notice';
import type { PermissionScope } from './bits';

/** Replacement notices for the two refusals {@link assertPermissions} raises. */
export interface PermissionNoticeOverrides {
    missingNotice?: new (message: string | undefined, subject: string, missingPerms: readonly string[]) => Notice;
    dangerousNotice?: new (message: string | undefined, subject: string, dangerousPerms: readonly string[]) => Notice;
}

/** The check {@link assertPermissions} runs. */
export interface PermissionAssertion extends PermissionNoticeOverrides {
    /** Mention string for who is checked, used as the refusal's subject. */
    subject: string;
    /** The effective permission bitfield the subject holds, computed by the caller. */
    permissions: bigint;
    /** The permission flag bits to check. */
    scope: PermissionScope;
    /** Refuse when the subject holds a scope bit. */
    inverse?: boolean;
}

/**
 * Refuses when the subject is missing a permission in `scope`, or with `inverse` when it holds one.
 * The Administrator bit passes any scope, and on the inverse arm it reports every bit in `scope`.
 *
 * The caller computes `permissions`, gateway off a discord.js role, member, or channel, and HTTP off the
 * bitfield the interaction payload carries.
 *
 * @throws A {@link Notice} listing the missing or present permissions.
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
 * // a replacement notice takes the same three arguments the default one does
 * class CannotBan extends Notice {
 *     public constructor(
 *         message: string | undefined,
 *         private readonly subject: string,
 *         private readonly missing: readonly string[]
 *     ) {
 *         super(message ?? 'You cannot ban here.');
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
 *     missingNotice: CannotBan
 * });
 * ```
 */
export function assertPermissions(check: PermissionAssertion): void {
    const { subject, permissions, scope, inverse = false, missingNotice, dangerousNotice } = check;

    if (inverse) {
        const present = presentNames(permissions, scope);
        if (present.length === 0) return;
        const Dangerous = dangerousNotice ?? HasDangerousPermissions;
        throw new Dangerous(undefined, subject, present);
    }

    if (hasAll(permissions, scope)) return;
    const Missing = missingNotice ?? MissingPermissions;
    throw new Missing(undefined, subject, missingNames(permissions, scope));
}
