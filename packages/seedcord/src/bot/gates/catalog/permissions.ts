import { checkPermissions } from '@bUtilities/permissions/checkPermissions';

import { defineGate } from '../Gate';
import { NotInGuild } from './access';
import { GateNotice } from './GateNotice';
import { pickNotice } from './options';

import type { GateNoticeOptions } from './options';
import type { Gate, InteractionGateContext, NonModalInteraction } from '../Gate';
import type { BotPermissionScope, PermissionErrorCtors } from '@bUtilities/permissions/checkPermissions';
import type { Role } from 'discord.js';

/**
 * Override for the permission gates, a `notice` ctor that receives the where and the missing permission names.
 *
 * Accepted by {@link RequirePermissions} and {@link RequireBotPermissions} instead of {@link GateNoticeOptions}.
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import type { Guild, GuildMember, Role, TextChannel } from 'discord.js';
 *
 * // notice is a Notice ctor: (message, where, missingPerms)
 * class MissingPermsNotice extends Notice {
 *     public constructor(message: string, where: Role | TextChannel | Guild | GuildMember, missing: string[]) {
 *         super(`${message} (${missing.join(', ')})`);
 *     }
 * }
 *
 * RequirePermissions([PermissionFlagsBits.BanMembers], { notice: MissingPermsNotice });
 * ```
 */
export interface RequirePermissionsOptions {
    /** A Notice ctor that receives the where and the missing permission names, replacing the default refusal. */
    notice?: PermissionErrorCtors['missing'];
}

/**
 * Refusal shown when the caller is missing a required role. {@link RequireRole} throws it.
 *
 * The default message reads from `role.name` when the role resolved, otherwise a generic line.
 *
 * @example
 * ```ts
 * import type { Role } from 'discord.js';
 *
 * // throw it from a custom gate when the resolved role is missing
 * defineGate('NeedsStaff', (ctx: InteractionGateContext<NonModalInteraction>) => {
 *     const role = ctx.guild?.roles.cache.get(STAFF_ROLE_ID) ?? null;
 *     if (!ctx.member?.roles.cache.has(STAFF_ROLE_ID)) throw new MissingRole(undefined, role);
 * });
 * ```
 *
 * @param message - Custom refusal text, or undefined to use the default that reads from `role.name`.
 * @param role - The role the caller is missing, or null when it could not be resolved.
 */
export class MissingRole extends GateNotice {
    public constructor(
        message: string | undefined,
        public readonly role: Role | null
    ) {
        super(message ?? (role ? `You need the ${role.name} role to use this.` : 'You do not have the required role.'));
    }
}

/**
 * Requires the caller to hold every permission in `scope`, via `checkPermissions`. Refuses outside a guild.
 *
 * Interaction-only and excludes ModalSubmit, since a modal lacks a reliable cached caller member.
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 *
 * \@Gated(RequirePermissions([PermissionFlagsBits.BanMembers]))
 * \@SlashRoute('ban')
 * class BanHandler extends SlashHandler<'ban'> {
 *     async execute() {
 *         const target = this.options.getUser('target');
 *     }
 * }
 * ```
 *
 * @param scope - The permission flag bits the caller must all hold.
 * @param options - Override the refusal Notice with a ctor that receives the where and the missing permission names.
 *
 * @see {@link Gated}
 */
export function RequirePermissions(
    scope: BotPermissionScope,
    options?: RequirePermissionsOptions
): Gate<InteractionGateContext<NonModalInteraction>, 'RequirePermissions'> {
    return defineGate('RequirePermissions', (ctx: InteractionGateContext<NonModalInteraction>) => {
        if (!ctx.member || !ctx.guild) throw new NotInGuild();
        checkPermissions(
            ctx.member,
            ctx.guild,
            scope,
            false,
            options?.notice ? { missing: options.notice } : undefined
        );
    });
}

/**
 * Requires the bot to hold every permission in `scope`, via `checkPermissions`. Refuses outside a guild.
 *
 * Checks the bot's own member, so unlike {@link RequirePermissions} it attaches to a modal handler too.
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 *
 * \@Gated(RequireBotPermissions([PermissionFlagsBits.BanMembers]))
 * \@ModalRoute(MyModalId)
 * class MyModalHandler extends ModalHandler<[typeof MyModalId]> {
 *     async execute() {
 *         // ...
 *     }
 * }
 * ```
 *
 * @param scope - The permission flag bits the bot must all hold.
 * @param options - Override the refusal Notice with a ctor that receives the where and the missing permission names.
 *
 * @see {@link Gated}
 */
export function RequireBotPermissions(
    scope: BotPermissionScope,
    options?: RequirePermissionsOptions
): Gate<InteractionGateContext, 'RequireBotPermissions'> {
    return defineGate('RequireBotPermissions', (ctx: InteractionGateContext) => {
        const botMember = ctx.guild?.members.me;
        if (!ctx.guild || !botMember) throw new NotInGuild();
        checkPermissions(botMember, ctx.guild, scope, false, options?.notice ? { missing: options.notice } : undefined);
    });
}

/**
 * Requires the caller to have `roleId`, read from the member's role cache. Refuses with {@link MissingRole}.
 *
 * Interaction-only and excludes ModalSubmit. Refuses outside a guild with {@link NotInGuild} first.
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
 *
 * @param roleId - The role snowflake the caller must hold, read from the member's role cache.
 * @param options - Reword the refusal message or replace the {@link MissingRole} Notice entirely.
 *
 * @see {@link Gated}
 */
export function RequireRole(
    roleId: string,
    options?: GateNoticeOptions
): Gate<InteractionGateContext<NonModalInteraction>, 'RequireRole'> {
    return defineGate('RequireRole', (ctx: InteractionGateContext<NonModalInteraction>) => {
        if (!ctx.member || !ctx.guild) throw new NotInGuild();
        if (ctx.member.roles.cache.has(roleId)) return;
        const role = ctx.guild.roles.cache.get(roleId) ?? null;
        throw pickNotice(options, (message) => new MissingRole(message, role));
    });
}
