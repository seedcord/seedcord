import type { InteractionGateContext } from './Gate';
import type { Core } from '@interfaces/Core';
import type { Repliables } from '@src/handlers/interactionTypes';
import type { APIUser } from 'discord-api-types/v10';

// autocomplete is skipped before gates run, so the payload here always carries a reply target
export function interactionGateContext(
    payload: Repliables,
    core: Core,
    routeId: string | null
): InteractionGateContext {
    const member = payload.member ?? null;
    // the wrapper types leave member and user both optional. Discord sends member.user in a guild and the
    // top-level user in a DM
    const resolved = member?.user ?? payload.user;
    return {
        kind: 'interaction',
        core,
        interaction: payload,
        // justified: every repliable interaction Discord delivers carries a user, the wrapper types don't say so
        user: resolved as APIUser,
        member,
        userId: resolved?.id ?? null,
        guildId: payload.guild_id ?? null,
        channelId: payload.channel?.id ?? null,
        memberRoleIds: member?.roles ?? [],
        memberPermissions: member ? BigInt(member.permissions) : null,
        // app_permissions is present on every interaction Discord delivers, including DMs
        appPermissions: BigInt(payload.app_permissions),
        routeId
    };
}
