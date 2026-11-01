import { Notice } from '@seedcord/core';
import { interactionFaultSource, PublishDefault } from '@seedcord/core/internal';

import { interactionUser } from '#handlers/interactionUser';

import type { ValidInteractionTypes } from '#handlers/interactionTypes';
import type { Core } from '#interfaces/Core';
import type { DispatchContext, SubscriptionData } from '@seedcord/core';
import type { RenderContext } from '@seedcord/types';

// the raw-payload twin of gateway's extractErrorResponse
export function reportFault(
    error: Error,
    uuid: RenderContext['uuid'],
    dispatch: DispatchContext,
    payload: ValidInteractionTypes,
    core: Core
): void {
    const source = interactionFaultSource(dispatch, {
        customId: 'custom_id' in payload.data ? payload.data.custom_id : null,
        userId: interactionUser(payload).id,
        guildId: payload.guild_id ?? null,
        channelId: payload.channel?.id ?? null,
        interactionId: payload.id,
        raw: payload
    });
    const from = { uuid, dispatchId: dispatch.id, origin: dispatch.routeId };
    if (error instanceof Notice && source)
        core.bus[PublishDefault]('handledException', { denial: error, ...from, source });
    else core.bus[PublishDefault]('unknownException', { ...from, error, ...actors(payload), metadata: payload });
}

// the raw payload has guild_id and no guild name
function actors(payload: ValidInteractionTypes): Pick<SubscriptionData<'unknownException'>, 'guild' | 'user'> {
    const { id, username } = interactionUser(payload);
    return { guild: undefined, user: { id, username } };
}
