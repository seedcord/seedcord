import { Notice } from '@seedcord/core';
import { PublishDefault } from '@seedcord/core/internal';
import { ApplicationCommandType, ComponentType, InteractionType } from 'discord-api-types/v10';

import { slashRouteOf } from './slashRouteOf';

import type { ValidInteractionTypes } from '@handlers/interactionTypes';
import type { Core } from '@interfaces/Core';
import type { FaultSource, SubscriptionData } from '@seedcord/core';
import type { RenderContext } from '@seedcord/types';

type InteractionFaultSource = Extract<FaultSource, { kind: 'interaction' }>;

// the raw-payload twin of gateway's extractErrorResponse
export function reportFault(
    error: Error,
    uuid: RenderContext['uuid'],
    routeId: string,
    payload: ValidInteractionTypes,
    core: Core
): void {
    const source = interactionSource(payload);
    if (error instanceof Notice && source)
        core.bus[PublishDefault]('handledException', { denial: error, uuid, routeId, source });
    else core.bus[PublishDefault]('unknownException', { uuid, error, routeId, ...actors(payload), metadata: payload });
}

// the raw payload has guild_id and no guild name
function actors(payload: ValidInteractionTypes): Pick<SubscriptionData<'unknownException'>, 'guild' | 'user'> {
    const user = payload.member?.user ?? payload.user;
    return { guild: undefined, user: user ? { id: user.id, username: user.username } : undefined };
}

function interactionSource(payload: ValidInteractionTypes): InteractionFaultSource | null {
    // discord sends member.user in a guild and user in a dm
    const user = payload.member?.user ?? payload.user;
    if (!user) return null;

    const common = {
        kind: 'interaction',
        userId: user.id,
        guildId: payload.guild_id ?? null,
        channelId: payload.channel?.id ?? null,
        interactionId: payload.id,
        raw: payload
    } as const;

    if (payload.type === InteractionType.ApplicationCommand) {
        const { data } = payload;
        const isSlash = data.type === ApplicationCommandType.ChatInput;
        return {
            ...common,
            interactionKind: isSlash ? 'slash' : 'context-menu',
            command: isSlash ? slashRouteOf(data) : data.name,
            customId: null
        };
    }
    if (payload.type === InteractionType.ModalSubmit) {
        return { ...common, interactionKind: 'modal', command: null, customId: payload.data.custom_id };
    }
    if (payload.type === InteractionType.MessageComponent) {
        const isButton = payload.data.component_type === ComponentType.Button;
        return {
            ...common,
            interactionKind: isButton ? 'button' : 'select',
            command: null,
            customId: payload.data.custom_id
        };
    }
    return null;
}
