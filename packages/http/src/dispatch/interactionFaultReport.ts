import { interactionFaultSource } from '@seedcord/core/internal';

import { interactionUser } from '#handlers/interactionUser';

import type { ValidInteractionTypes } from '#handlers/interactionTypes';
import type { FaultDetails, InteractionDispatch } from '@seedcord/core/internal';

export function interactionFaultReport(payload: ValidInteractionTypes, dispatch: InteractionDispatch): FaultDetails {
    const { id, username } = interactionUser(payload);
    return {
        dispatch,
        origin: dispatch.routeId,
        source: interactionFaultSource(dispatch, {
            customId: 'custom_id' in payload.data ? payload.data.custom_id : null,
            userId: id,
            guildId: payload.guild_id ?? null,
            channelId: payload.channel?.id ?? null,
            interactionId: payload.id,
            raw: payload
        }),
        // the raw payload carries only the guild's id
        guild: undefined,
        user: { id, username },
        metadata: payload
    };
}
