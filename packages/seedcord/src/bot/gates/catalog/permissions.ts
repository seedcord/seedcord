import { checkPermissions } from '@bUtilities/permissions/checkPermissions';

import { defineGate } from '../Gate';
import { NotInGuild } from './access';
import { GateNotice } from './GateNotice';
import { pickNotice } from './options';

import type { GateNoticeOptions } from './options';
import type { Gate, InteractionGateContext, NonModalInteraction } from '../Gate';
import type { BotPermissionScope, PermissionErrorCtors } from '@bUtilities/permissions/checkPermissions';
import type { Role } from 'discord.js';

/** Override for the permission gates, a `notice` ctor that receives the where and the missing permission names. */
export interface RequirePermissionsOptions {
    notice?: PermissionErrorCtors['missing'];
}

/** Refusal shown when the caller is missing a required role. */
export class MissingRole extends GateNotice {
    public constructor(
        message: string | undefined,
        public readonly role: Role | null
    ) {
        super(message ?? (role ? `You need the ${role.name} role to use this.` : 'You do not have the required role.'));
    }
}

/** Requires the caller to hold every permission in `scope`, via `checkPermissions`. Refuses outside a guild. */
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

/** Requires the bot to hold every permission in `scope`, via `checkPermissions`. Refuses outside a guild. */
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

/** Requires the caller to have `roleId`, read from the member's role cache. Refuses with {@link MissingRole}. */
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
