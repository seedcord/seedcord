import * as crypto from 'node:crypto';

import { Notice, Fault } from '@seedcord/core';
import { logUnknownFault, PublishDefault } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { assertNever } from '@seedcord/utils';

import type { Core } from '#interfaces/Core';
import type { Repliables } from '#src/handlers/interactionTypes';
import type { DispatchContext, FaultSource } from '@seedcord/core';
import type { RenderContext, ReplyResponse, Nullable } from '@seedcord/types';
import type { AutocompleteInteraction, Guild, User } from 'discord.js';
import type { UUID } from 'node:crypto';
import type { TaggedUnion } from 'type-fest';

type InteractionFaultSource = Extract<FaultSource, { kind: 'interaction' }>;
type EventFaultSource = Extract<FaultSource, { kind: 'event' }>;

const logger = new Logger('ErrorsHandling', { channel: 'errors' });

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
        interaction: { interaction: Repliables };
        autocomplete: { interaction: AutocompleteInteraction };
        event: { event: EventOrigin };
    }
>;

interface FaultFacts {
    origin: string;
    guild: Nullable<Guild>;
    user: Nullable<User>;
    metadata: unknown;
    // an autocomplete throw doesn't have a typed source
    source: (() => FaultSource) | null;
}

export interface ExtractedErrorResponse {
    uuid: UUID;
    response: ReplyResponse;
}

export function extractErrorResponse(error: Error, core: Core, fault: ErrorOrigin): ExtractedErrorResponse {
    const uuid = crypto.randomUUID();
    const { dispatch } = fault;
    const facts = factsOf(fault);
    const developerUsername = core.config.notifications?.developerUsername;
    const ctx: RenderContext =
        developerUsername === undefined ? { uuid, dispatch } : { uuid, developerUsername, dispatch };

    if (error instanceof Notice) {
        if (error.report) {
            logger.error(`${error.name}: ${uuid}`, error);
            if (facts.source) {
                core.bus[PublishDefault]('handledException', {
                    denial: error,
                    uuid,
                    dispatchId: dispatch.id,
                    origin: facts.origin,
                    source: facts.source()
                });
            } else publishUnknown(error, core, dispatch, facts, uuid);
        }
        return { uuid, response: error.render(ctx) };
    }

    logUnknownFault(logger, uuid, error, core.config.errors);
    publishUnknown(error, core, dispatch, facts, uuid);

    const Override = core.config.errors?.defaultError;
    const response = Override ? new Override(uuid).render(ctx) : new Fault().render(ctx);

    return { uuid, response };
}

function factsOf(fault: ErrorOrigin): FaultFacts {
    switch (fault.kind) {
        case 'event': {
            const { event } = fault;
            return {
                origin: `event:${event.name}:${event.handler}`,
                guild: event.guild,
                user: event.user,
                metadata: { eventName: event.name, handler: event.handler, args: event.args },
                source: () => buildEventSource(event)
            };
        }
        case 'interaction': {
            const { interaction, dispatch } = fault;
            return {
                origin: dispatch.routeId,
                guild: interaction.guild,
                user: interaction.user,
                metadata: interaction,
                source: () => buildInteractionSource(interaction, dispatch)
            };
        }
        case 'autocomplete': {
            return {
                origin: fault.dispatch.routeId,
                guild: fault.interaction.guild,
                user: fault.interaction.user,
                metadata: fault.interaction,
                source: null
            };
        }
        default: {
            return assertNever(fault);
        }
    }
}

function publishUnknown(error: Error, core: Core, dispatch: DispatchContext, facts: FaultFacts, uuid: UUID): void {
    const { origin, guild, user, metadata } = facts;
    core.bus[PublishDefault]('unknownException', {
        uuid,
        dispatchId: dispatch.id,
        error,
        origin,
        // the bus payload must stay djs-free
        guild: guild ? { id: guild.id, name: guild.name } : undefined,
        user: user ? { id: user.id, username: user.username } : undefined,
        metadata
    });
}

function buildEventSource(event: EventOrigin): EventFaultSource {
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

function buildInteractionSource(interaction: Repliables, dispatch: DispatchContext): InteractionFaultSource {
    const command = interaction.isCommand() ? dispatch.route : null;
    const customId =
        interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()
            ? interaction.customId
            : null;

    return {
        kind: 'interaction',
        interactionKind: interactionKind(interaction),
        command,
        customId,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        interactionId: interaction.id,
        raw: interaction
    };
}

function interactionKind(interaction: Repliables): InteractionFaultSource['interactionKind'] {
    if (interaction.isChatInputCommand()) return 'slash';
    if (interaction.isContextMenuCommand()) return 'context-menu';
    if (interaction.isButton()) return 'button';
    if (interaction.isAnySelectMenu()) return 'select';
    return 'modal';
}
