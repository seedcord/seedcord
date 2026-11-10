import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { defineGate } from '#gates/Gate';
import { MissingRole, NotInGuild, PermissionsUnresolved } from '#notices/index';
import { assertPermissions } from '#src/permissions/assert';

import type { AppPermissionsContext, Gate, GateContextBase, GuildPermissionsContext } from '#gates/Gate';
import type { PermissionNoticeConstructor } from '#src/permissions/assert';
import type { PermissionScope } from '#src/permissions/bits';
import type { NoticeConstructor } from '#stops/Notice';

export type { PermissionScope } from '#src/permissions/bits';

const BOT_SUBJECT = 'The bot';

/**
 * Options for {@link RequireBotPermissions}.
 */
export interface RequireBotPermissionsOptions {
    /**
     * The set the check reads. `'channel'` reads the effective channel set in the payload, what
     * Discord enforces in the invoked channel. `'guild'` reads the base set from roles, available on the
     * gateway transport only.
     *
     * @defaultValue `'channel'`
     */
    in?: 'channel' | 'guild';
    /** Your Notice class, constructed and thrown in place of the refusal outside a guild. */
    notInGuild?: NoticeConstructor;
    /** Your Notice class, constructed and thrown in place of the refusal when a permission is missing. */
    missing?: PermissionNoticeConstructor;
}

/**
 * Options for {@link RequirePermissions}.
 */
export interface RequirePermissionsOptions extends RequireBotPermissionsOptions {
    /** Your Notice class, constructed and thrown in place of the refusal when the member's permissions are unavailable inside a guild. */
    unresolved?: NoticeConstructor;
}

/**
 * Options for {@link RequireRole}.
 */
export interface RequireRoleOptions {
    /** Your Notice class, constructed and thrown in place of the refusal outside a guild. */
    notInGuild?: NoticeConstructor;
    /** Your Notice class, constructed with the role id and thrown in place of the refusal when the caller doesn't have the role. */
    missingRole?: NoticeConstructor<[roleId: string]>;
}

interface HeldCheck {
    guildId: string | null;
    subject: string | null;
    readOrThrow: (guildId: string) => bigint;
}

function requireHeld(
    { guildId, subject, readOrThrow }: HeldCheck,
    scope: PermissionScope,
    options: RequireBotPermissionsOptions | undefined
): void {
    if (!guildId) throw new (options?.notInGuild ?? NotInGuild)();
    const permissions = readOrThrow(guildId);
    assertPermissions({ subject, permissions, scope, notice: options?.missing });
}

function botMemberMissing(guildId: string): never {
    throw new SeedcordError(SeedcordErrorCode.CoreBotMemberMissing, [guildId]);
}

/**
 * Requires the caller to hold every permission in `scope`. Refuses outside a guild first, then when the
 * member's permissions are unavailable, then when a permission is missing. The Administrator bit passes any
 * scope.
 *
 * The default `'channel'` scope reads the effective channel set in the payload, what Discord enforces
 * in the invoked channel. The `'guild'` scope reads the base set from roles and requires a
 * {@link GuildPermissionsContext}, so it fits a gateway handler only.
 *
 * @param scope - The permission flag bits the caller must all hold.
 * @param options - Pick the scope with `in`. Replace a refusal with a Notice class as `notInGuild`, `unresolved`, or `missing`.
 *
 * @see the `@Gated` decorator from your transport package
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
    const resolved = (held: bigint | null): bigint => {
        if (held === null) throw new (options?.unresolved ?? PermissionsUnresolved)();
        return held;
    };
    if (options?.in === 'guild') {
        return defineGate('RequirePermissions', (ctx: GuildPermissionsContext) => {
            const readOrThrow = (): bigint => resolved(ctx.memberGuildPermissions);
            requireHeld({ guildId: ctx.guildId, subject: null, readOrThrow }, scope, options);
        });
    }
    return defineGate('RequirePermissions', (ctx: GateContextBase) => {
        const readOrThrow = (): bigint => resolved(ctx.memberPermissions);
        requireHeld({ guildId: ctx.guildId, subject: null, readOrThrow }, scope, options);
    });
}

/**
 * Requires the bot to hold every permission in `scope`. Refuses outside a guild first, then when a
 * permission is missing. The Administrator bit passes any scope.
 *
 * The default `'channel'` scope reads the bot's effective channel set (wire `app_permissions`), what
 * Discord enforces in the invoked channel. The `'guild'` scope reads the bot's base set from roles and
 * requires a {@link GuildPermissionsContext}, fitting a gateway handler only. The channel scope requires an
 * {@link AppPermissionsContext}. An event handler takes `in: 'guild'`.
 *
 * @param scope - The permission flag bits the bot must all hold.
 * @param options - Pick the scope with `in`. Replace a refusal with a Notice class as `notInGuild` or `missing`.
 * @throws A **SeedcordError** when the `'guild'` scope runs and the bot's own member isn't cached.
 *
 * @see the `@Gated` decorator from your transport package
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
    options: RequireBotPermissionsOptions & { in: 'guild' }
): Gate<GuildPermissionsContext, 'RequireBotPermissions'>;
export function RequireBotPermissions(
    scope: PermissionScope,
    options?: RequireBotPermissionsOptions & { in?: 'channel' }
): Gate<AppPermissionsContext, 'RequireBotPermissions'>;
export function RequireBotPermissions(
    scope: PermissionScope,
    options?: RequireBotPermissionsOptions
): Gate<GuildPermissionsContext, 'RequireBotPermissions'> | Gate<AppPermissionsContext, 'RequireBotPermissions'> {
    if (options?.in === 'guild') {
        return defineGate('RequireBotPermissions', (ctx: GuildPermissionsContext) => {
            const readOrThrow = (guildId: string): bigint => ctx.appGuildPermissions ?? botMemberMissing(guildId);
            requireHeld({ guildId: ctx.guildId, subject: BOT_SUBJECT, readOrThrow }, scope, options);
        });
    }
    return defineGate('RequireBotPermissions', (ctx: AppPermissionsContext) => {
        requireHeld(
            { guildId: ctx.guildId, subject: BOT_SUBJECT, readOrThrow: () => ctx.appPermissions },
            scope,
            options
        );
    });
}

/**
 * Requires the caller to hold `roleId`, read from the member's role ids. Refuses outside a guild first,
 * then when the role is missing. Roles are guild-global, so they don't vary by scope.
 *
 * @param roleId - The role snowflake the caller must hold.
 * @param options - Replace a refusal with a Notice class as `notInGuild` or `missingRole`.
 *
 * @see the `@Gated` decorator from your transport package
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
        if (!ctx.guildId) throw new (options?.notInGuild ?? NotInGuild)();
        if (ctx.memberRoleIds.includes(roleId)) return;
        throw new (options?.missingRole ?? MissingRole)(roleId);
    });
}
