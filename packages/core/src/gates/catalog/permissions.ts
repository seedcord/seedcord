import { defineGate } from '@gates/Gate';
import { MissingPermissions, MissingRole, NotInGuild } from '@notices/index';
import { hasAll, missingNames } from '@src/permissions/bits';

import { pickNotice } from './options';

import type { GateNoticeOptions } from './options';
import type { Gate, GateContextBase, GuildPermissionsContext } from '@gates/Gate';
import type { PermissionScope } from '@src/permissions/bits';

export type { PermissionScope } from '@src/permissions/bits';
export { PermissionNames } from '@src/permissions/bits';

interface PermCheckKind {
    unresolved: string;
    subject: string | null;
}

const MEMBER_CHECK: PermCheckKind = {
    unresolved: 'Your server member data could not be resolved. Try again.',
    subject: null
};
const BOT_CHECK: PermCheckKind = {
    unresolved: "The bot's permissions could not be resolved. Try again.",
    subject: 'The bot'
};

function refusePermissions(
    held: bigint | null,
    scope: PermissionScope,
    options: RequirePermissionsOptions | undefined,
    guildId: string | null,
    kind: PermCheckKind
): void {
    if (held === null) {
        throw pickNotice(
            options?.notInGuild,
            (message) => new NotInGuild(message ?? (guildId ? kind.unresolved : undefined))
        );
    }
    if (hasAll(held, scope)) return;
    throw pickNotice(
        options?.missing,
        (message) => new MissingPermissions(message, kind.subject, missingNames(held, scope))
    );
}

/**
 * Options for {@link RequirePermissions} and {@link RequireBotPermissions}.
 */
export interface RequirePermissionsOptions {
    /**
     * The set the check reads. `'channel'` reads the effective channel set the payload carries, what
     * Discord enforces in the invoked channel. `'guild'` reads the base set from roles, available on the
     * gateway transport only.
     *
     * @defaultValue `'channel'`
     */
    in?: 'channel' | 'guild';
    /** Reword or replace the refusal shown when the set is unavailable (outside a guild, or unresolved inside one). */
    notInGuild?: GateNoticeOptions;
    /** Reword or replace the refusal shown when a permission is missing. */
    missing?: GateNoticeOptions;
}

/**
 * Options for {@link RequireRole}.
 */
export interface RequireRoleOptions {
    /** Reword or replace the refusal shown outside a guild. */
    notInGuild?: GateNoticeOptions;
    /** Reword or replace the refusal shown when the caller lacks the role. */
    missingRole?: GateNoticeOptions;
}

/**
 * Requires the caller to hold every permission in `scope`. Refuses outside a guild first, then when a
 * permission is missing. The Administrator bit passes any scope.
 *
 * The default `'channel'` scope reads the effective channel set the payload carries, what Discord enforces
 * in the invoked channel. The `'guild'` scope reads the base set from roles and requires a
 * {@link GuildPermissionsContext}, so it fits a gateway handler only.
 *
 * @param scope - The permission flag bits the caller must all hold.
 * @param options - Pick the scope with `in`, and override each refusal with `notInGuild` or `missing`.
 *
 * @see the `@Gated` decorator from `seedcord`
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord-api-types/v10';
 *
 * \@Gated(RequirePermissions([PermissionFlagsBits.BanMembers]))
 * \@SlashRoute('ban')
 * class BanHandler extends SlashHandler<'ban'> {
 *     async execute() {
 *         // ...
 *     }
 * }
 * ```
 *
 * @example
 * ```ts
 * // the base set from roles, on a gateway handler
 * RequirePermissions([PermissionFlagsBits.BanMembers], { in: 'guild' });
 * ```
 */
export function RequirePermissions(
    scope: PermissionScope,
    options: RequirePermissionsOptions & { in: 'guild' }
): Gate<GuildPermissionsContext, 'RequirePermissions'>;
export function RequirePermissions(
    scope: PermissionScope,
    options?: RequirePermissionsOptions & { in?: 'channel' }
): Gate<GateContextBase, 'RequirePermissions'>;
export function RequirePermissions(
    scope: PermissionScope,
    options?: RequirePermissionsOptions
): Gate<GuildPermissionsContext, 'RequirePermissions'> | Gate<GateContextBase, 'RequirePermissions'> {
    if (options?.in === 'guild') {
        return defineGate('RequirePermissions', (ctx: GuildPermissionsContext) => {
            refusePermissions(ctx.memberGuildPermissions, scope, options, ctx.guildId, MEMBER_CHECK);
        });
    }
    return defineGate('RequirePermissions', (ctx: GateContextBase) => {
        refusePermissions(ctx.memberPermissions, scope, options, ctx.guildId, MEMBER_CHECK);
    });
}

/**
 * Requires the bot to hold every permission in `scope`. Refuses outside a guild first, then when a
 * permission is missing. The Administrator bit passes any scope.
 *
 * The default `'channel'` scope reads the bot's effective channel set (wire `app_permissions`), what
 * Discord enforces in the invoked channel. The `'guild'` scope reads the bot's base set from roles and
 * requires a {@link GuildPermissionsContext}, fitting a gateway handler only. `app_permissions` is
 * absent on gateway events, the channel scope refuses there as unresolved, use `in: 'guild'` on an
 * event handler.
 *
 * @param scope - The permission flag bits the bot must all hold.
 * @param options - Pick the scope with `in`, and override each refusal with `notInGuild` or `missing`.
 *
 * @see the `@Gated` decorator from `seedcord`
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord-api-types/v10';
 *
 * \@Gated(RequireBotPermissions([PermissionFlagsBits.ManageMessages]))
 * \@SlashRoute('purge')
 * class PurgeHandler extends SlashHandler<'purge'> {
 *     async execute() {
 *         // ...
 *     }
 * }
 * ```
 */
export function RequireBotPermissions(
    scope: PermissionScope,
    options: RequirePermissionsOptions & { in: 'guild' }
): Gate<GuildPermissionsContext, 'RequireBotPermissions'>;
export function RequireBotPermissions(
    scope: PermissionScope,
    options?: RequirePermissionsOptions & { in?: 'channel' }
): Gate<GateContextBase, 'RequireBotPermissions'>;
export function RequireBotPermissions(
    scope: PermissionScope,
    options?: RequirePermissionsOptions
): Gate<GuildPermissionsContext, 'RequireBotPermissions'> | Gate<GateContextBase, 'RequireBotPermissions'> {
    if (options?.in === 'guild') {
        return defineGate('RequireBotPermissions', (ctx: GuildPermissionsContext) => {
            refusePermissions(ctx.appGuildPermissions, scope, options, ctx.guildId, BOT_CHECK);
        });
    }
    return defineGate('RequireBotPermissions', (ctx: GateContextBase) => {
        refusePermissions(ctx.appPermissions, scope, options, ctx.guildId, BOT_CHECK);
    });
}

/**
 * Requires the caller to hold `roleId`, read from the member's role ids. Refuses outside a guild first,
 * then when the role is missing. Roles are guild-global, so there is no scope dimension.
 *
 * @param roleId - The role snowflake the caller must hold.
 * @param options - Override each refusal, the outside-guild one with `notInGuild` and the missing-role one with `missingRole`.
 *
 * @see the `@Gated` decorator from `seedcord`
 *
 * @example
 * ```ts
 * \@Gated(RequireRole('123456789012345678'))
 * \@SlashRoute('vip')
 * class VipHandler extends SlashHandler<'vip'> {
 *     async execute() {
 *         // ...
 *     }
 * }
 * ```
 */
export function RequireRole(roleId: string, options?: RequireRoleOptions): Gate<GateContextBase, 'RequireRole'> {
    return defineGate('RequireRole', (ctx) => {
        if (!ctx.guildId) throw pickNotice(options?.notInGuild, (message) => new NotInGuild(message));
        if (ctx.memberRoleIds.includes(roleId)) return;
        throw pickNotice(options?.missingRole, (message) => new MissingRole(message, roleId));
    });
}
