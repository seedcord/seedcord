import { interactionFaultSource } from '@seedcord/core/internal';

import type { ValidInteractionTypes } from '#src/handlers/interactionTypes';
import type { DispatchContext } from '@seedcord/core';
import type { FaultReport } from '@seedcord/core/internal';
import type { Nullable, RenderContext } from '@seedcord/types';
import type { Guild, User } from 'discord.js';

interface EventOrigin {
    name: string;
    handler: string;
    args: unknown;
    channelId: string | null;
    guild: Nullable<Guild>;
    user: Nullable<User>;
}

export function interactionFaultReport(
    interaction: ValidInteractionTypes,
    dispatch: DispatchContext,
    uuid: RenderContext['uuid']
): FaultReport {
    return {
        uuid,
        dispatch,
        origin: dispatch.routeId,
        source: interactionFaultSource(dispatch, {
            customId: 'customId' in interaction ? interaction.customId : null,
            userId: interaction.user.id,
            guildId: interaction.guildId,
            channelId: interaction.channelId,
            interactionId: interaction.id,
            raw: interaction
        }),
        ...scalarActors(interaction.guild, interaction.user),
        metadata: interaction
    };
}

export function eventFaultReport(
    event: EventOrigin,
    dispatch: DispatchContext,
    uuid: RenderContext['uuid']
): FaultReport {
    return {
        uuid,
        dispatch,
        origin: `event:${event.name}:${event.handler}`,
        source: {
            kind: 'event',
            eventName: event.name,
            handler: event.handler,
            userId: event.user?.id ?? null,
            guildId: event.guild?.id ?? null,
            channelId: event.channelId,
            raw: event.args
        },
        ...scalarActors(event.guild, event.user),
        metadata: { eventName: event.name, handler: event.handler, args: event.args }
    };
}

// the bus payload must stay djs-free
function scalarActors(guild: Nullable<Guild>, user: Nullable<User>): Pick<FaultReport, 'guild' | 'user'> {
    return {
        guild: guild ? { id: guild.id, name: guild.name } : undefined,
        user: user ? { id: user.id, username: user.username } : undefined
    };
}
