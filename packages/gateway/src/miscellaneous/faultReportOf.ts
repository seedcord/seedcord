import { interactionFaultSource } from '@seedcord/core/internal';
import { assertNever } from '@seedcord/utils';

import type { ValidInteractionTypes } from '#src/handlers/interactionTypes';
import type { DispatchContext } from '@seedcord/core';
import type { EventFaultSource, FaultReport } from '@seedcord/core/internal';
import type { Nullable, RenderContext } from '@seedcord/types';
import type { Guild, User } from 'discord.js';
import type { TaggedUnion } from 'type-fest';

interface EventOrigin {
    name: string;
    handler: string;
    args: unknown;
    channelId: string | null;
    guild: Nullable<Guild>;
    user: Nullable<User>;
}

export type ErrorOrigin = { dispatch: DispatchContext } & TaggedUnion<
    'kind',
    {
        interaction: { interaction: ValidInteractionTypes };
        event: { event: EventOrigin };
    }
>;

export function faultReportOf(fault: ErrorOrigin, uuid: RenderContext['uuid']): FaultReport {
    switch (fault.kind) {
        case 'event': {
            const { event, dispatch } = fault;
            return {
                uuid,
                dispatch,
                origin: `event:${event.name}:${event.handler}`,
                source: eventSource(event),
                ...scalarActors(event.guild, event.user),
                metadata: { eventName: event.name, handler: event.handler, args: event.args }
            };
        }
        case 'interaction': {
            const { interaction, dispatch } = fault;
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
        default: {
            return assertNever(fault);
        }
    }
}

// the bus payload must stay djs-free
function scalarActors(guild: Nullable<Guild>, user: Nullable<User>): Pick<FaultReport, 'guild' | 'user'> {
    return {
        guild: guild ? { id: guild.id, name: guild.name } : undefined,
        user: user ? { id: user.id, username: user.username } : undefined
    };
}

function eventSource(event: EventOrigin): EventFaultSource {
    return {
        kind: 'event',
        eventName: event.name,
        handler: event.handler,
        userId: event.user?.id ?? null,
        guildId: event.guild?.id ?? null,
        channelId: event.channelId,
        raw: event.args
    };
}
