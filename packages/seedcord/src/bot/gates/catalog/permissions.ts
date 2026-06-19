import { MissingRole, NotInGuild } from '@bot/notices';
import { checkPermissions } from '@bUtilities/permissions/checkPermissions';

import { defineGate } from '../Gate';
import { pickNotice } from './options';

import type { GateNoticeOptions } from './options';
import type { Gate, InteractionGateContext, NonModalInteraction } from '../Gate';
import type { BotPermissionScope, PermissionErrorCtors } from '@bUtilities/permissions/checkPermissions';

/**
 * Options for {@link RequirePermissions} and {@link RequireBotPermissions}, one override per refusal the gate
 * can show.
 *
 * @example
 * ```ts
 * import { PermissionFlagsBits } from 'discord.js';
 * import type { Guild, GuildMember, Role, TextChannel } from 'discord.js';
 *
 * // `missing` is a Notice ctor: (message, where, missingPerms)
 * class MissingPermsNotice extends Notice {
 *     public constructor(message: string, where: Role | TextChannel | Guild | GuildMember, missing: string[]) {
 *         super(`${message} (${missing.join(', ')})`);
 *     }
 * }
 *
 * RequirePermissions([PermissionFlagsBits.BanMembers], { missing: MissingPermsNotice });
 * ```
 */
export interface RequirePermissionsOptions {
    /** Reword or replace the refusal shown outside a guild. */
    notInGuild?: GateNoticeOptions;
    /** Replace the missing-permissions refusal with a ctor that receives the where and the missing perm names. */
    missing?: PermissionErrorCtors['missing'];
}

/**
 * Options for {@link RequireRole}, one override per refusal the gate can show.
 */
export interface RequireRoleOptions {
    /** Reword or replace the refusal shown outside a guild. */
    notInGuild?: GateNoticeOptions;
    /** Reword or replace the refusal shown when the caller lacks the role. */
    missingRole?: GateNoticeOptions;
}

/**
 * Requires the caller to hold every permission in `scope`, via `checkPermissions`. Refuses outside a guild.
 *
 * Interaction-only and excludes ModalSubmit, since a modal lacks a reliable cached caller member.
 *
 * @param scope - The permission flag bits the caller must all hold.
 * @param options - Override each refusal, the outside-guild one with `notInGuild` and the missing-permissions one with `missing`.
 *
 * @see {@link Gated}
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
 */
export function RequirePermissions(
    scope: BotPermissionScope,
    options?: RequirePermissionsOptions
): Gate<InteractionGateContext<NonModalInteraction>, 'RequirePermissions'> {
    return defineGate('RequirePermissions', (ctx: InteractionGateContext<NonModalInteraction>) => {
        if (!ctx.member || !ctx.guild) throw pickNotice(options?.notInGuild, (message) => new NotInGuild(message));
        checkPermissions(
            ctx.member,
            ctx.guild,
            scope,
            false,
            options?.missing ? { missing: options.missing } : undefined
        );
    });
}

/**
 * Requires the bot to hold every permission in `scope`, via `checkPermissions`. Refuses outside a guild.
 *
 * Checks the bot's own member, so unlike {@link RequirePermissions} it attaches to a modal handler too.
 *
 * @param scope - The permission flag bits the bot must all hold.
 * @param options - Override each refusal, the outside-guild one with `notInGuild` and the missing-permissions one with `missing`.
 *
 * @see {@link Gated}
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
 */
export function RequireBotPermissions(
    scope: BotPermissionScope,
    options?: RequirePermissionsOptions
): Gate<InteractionGateContext, 'RequireBotPermissions'> {
    return defineGate('RequireBotPermissions', (ctx: InteractionGateContext) => {
        const botMember = ctx.guild?.members.me;
        if (!ctx.guild || !botMember) throw pickNotice(options?.notInGuild, (message) => new NotInGuild(message));
        checkPermissions(
            botMember,
            ctx.guild,
            scope,
            false,
            options?.missing ? { missing: options.missing } : undefined
        );
    });
}

/**
 * Requires the caller to have `roleId`, read from the member's role cache. Refuses outside a guild first, then
 * when the role is missing.
 *
 * Interaction-only and excludes ModalSubmit.
 *
 * @param roleId - The role snowflake the caller must hold, read from the member's role cache.
 * @param options - Override each refusal, the outside-guild one with `notInGuild` and the missing-role one with `missingRole`.
 *
 * @see {@link Gated}
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
export function RequireRole(
    roleId: string,
    options?: RequireRoleOptions
): Gate<InteractionGateContext<NonModalInteraction>, 'RequireRole'> {
    return defineGate('RequireRole', (ctx: InteractionGateContext<NonModalInteraction>) => {
        if (!ctx.member || !ctx.guild) throw pickNotice(options?.notInGuild, (message) => new NotInGuild(message));
        if (ctx.member.roles.cache.has(roleId)) return;
        const role = ctx.guild.roles.cache.get(roleId) ?? null;
        throw pickNotice(options?.missingRole, (message) => new MissingRole(message, role));
    });
}
