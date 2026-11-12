import { interactionUser } from '#handlers/interactionUser';

import type { Core } from '#interfaces/Core';
import type { Repliables, ValidInteractionTypes } from '#src/handlers/interactionTypes';
import type { InteractionGateContext } from './Gate';
import type { DispatchContext } from '@seedcord/core';
import type { InteractionRunConfig } from '@seedcord/core/internal';

export function interactionOrigin(payload: ValidInteractionTypes): InteractionRunConfig['origin'] {
    return {
        userId: interactionUser(payload).id,
        guildId: payload.guild_id ?? null,
        channelId: payload.channel?.id ?? null,
        userLocale: payload.locale,
        guildLocale: payload.guild_locale ?? null
    };
}

export function interactionGateContext(
    payload: Repliables,
    core: Core,
    dispatch: DispatchContext
): InteractionGateContext {
    const member = payload.member ?? null;
    return {
        kind: 'interaction',
        core,
        dispatch,
        interaction: payload,
        user: interactionUser(payload),
        member,
        ...interactionOrigin(payload),
        memberRoleIds: member?.roles ?? [],
        memberPermissions: member ? BigInt(member.permissions) : null,
        // app_permissions is present on every interaction Discord delivers, including DMs
        appPermissions: BigInt(payload.app_permissions)
    };
}
