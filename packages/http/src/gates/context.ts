import { interactionUser } from '#handlers/interactionUser';

import type { Core } from '#interfaces/Core';
import type { Repliables } from '#src/handlers/interactionTypes';
import type { InteractionGateContext } from './Gate';
import type { DispatchContext } from '@seedcord/core';

// autocomplete is skipped before gates run, so the payload here always carries a reply target
export function interactionGateContext(
    payload: Repliables,
    core: Core,
    dispatch: DispatchContext
): InteractionGateContext {
    const member = payload.member ?? null;
    const user = interactionUser(payload);
    return {
        kind: 'interaction',
        core,
        dispatch,
        interaction: payload,
        user,
        member,
        userId: user.id,
        guildId: payload.guild_id ?? null,
        channelId: payload.channel?.id ?? null,
        memberRoleIds: member?.roles ?? [],
        memberPermissions: member ? BigInt(member.permissions) : null,
        // app_permissions is present on every interaction Discord delivers, including DMs
        appPermissions: BigInt(payload.app_permissions),
        declaredRoute: dispatch.declaredRoute
    };
}
