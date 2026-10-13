import * as crypto from 'node:crypto';

import { Notice, Fault } from '@seedcord/core';
import { PublishDefault } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';

import { slashRouteOf } from '#bot/utilities/miscellaneous/slashRouteOf';

import type { Core } from '#interfaces/Core';
import type { Repliables } from '#src/handlers/interactionTypes';
import type { DispatchContext, FaultSource, SubscriptionData } from '@seedcord/core';
import type { RenderContext, ReplyResponse, Nullable } from '@seedcord/types';
import type { Guild, User } from 'discord.js';
import type { UUID } from 'node:crypto';

type InteractionFaultSource = Extract<FaultSource, { kind: 'interaction' }>;
type EventFaultSource = Extract<FaultSource, { kind: 'event' }>;

const logger = new Logger('ErrorsHandling', { channel: 'errors' });

interface EventOrigin {
    name: string;
    handler: string;
    args: unknown;
    channelId: string | null;
}

export interface ErrorOrigin {
    interaction?: Repliables;
    event?: EventOrigin;
    origin: string;
    dispatch: DispatchContext;
    guild: Nullable<Guild>;
    user: Nullable<User>;
    metadata?: unknown;
}

export interface ExtractedErrorResponse {
    uuid: UUID;
    response: ReplyResponse;
}

export function extractErrorResponse(error: Error, core: Core, fault: ErrorOrigin): ExtractedErrorResponse {
    const uuid = crypto.randomUUID();
    const { dispatch } = fault;
    const developerUsername = core.config.notifications?.developerUsername;
    const ctx: RenderContext =
        developerUsername === undefined ? { uuid, dispatch } : { uuid, developerUsername, dispatch };

    if (error instanceof Notice) {
        if (error.report) reportFault(error, core, fault, uuid);
        return { uuid, response: error.render(ctx) };
    }

    reportRawFault(error, core, fault, uuid);

    const Override = core.config.errors?.defaultError;
    const response = Override ? new Override(uuid).render(ctx) : new Fault().render(ctx);

    return { uuid, response };
}

function reportFault(denial: Notice, core: Core, fault: ErrorOrigin, uuid: UUID): void {
    logger.error(`${denial.name}: ${uuid}`, denial);

    if (fault.interaction) {
        core.bus[PublishDefault]('handledException', {
            denial,
            uuid,
            dispatchId: fault.dispatch.id,
            origin: fault.origin,
            source: buildInteractionSource(fault.interaction)
        });
    } else if (fault.event) {
        core.bus[PublishDefault]('handledException', {
            denial,
            uuid,
            dispatchId: fault.dispatch.id,
            origin: fault.origin,
            source: buildEventSource(fault.event, fault)
        });
    } else {
        // an autocomplete throw has no typed source. unknownException is the only channel left
        core.bus[PublishDefault]('unknownException', {
            uuid,
            dispatchId: fault.dispatch.id,
            error: denial,
            origin: fault.origin,
            ...scalarActors(fault),
            metadata: metadataFor(fault)
        });
    }
}

function causeLine(error: Error): string {
    const { cause } = error;
    if (!Error.isError(cause)) return '';
    const [first] = cause.message.split('\n');
    return `\ncaused by ${cause.name}: ${first ?? cause.message}`;
}

function reportRawFault(error: Error, core: Core, fault: ErrorOrigin, uuid: UUID): void {
    const showStack = core.config.errors?.errorStack ?? true;
    if (showStack) logger.error(uuid, error);
    else logger.error(`${uuid} | ${error.message}${causeLine(error)}`);

    core.bus[PublishDefault]('unknownException', {
        uuid,
        dispatchId: fault.dispatch.id,
        error,
        origin: fault.origin,
        ...scalarActors(fault),
        metadata: metadataFor(fault)
    });
}

// the bus payload must stay djs-free
function scalarActors(fault: ErrorOrigin): Pick<SubscriptionData<'unknownException'>, 'guild' | 'user'> {
    return {
        guild: fault.guild ? { id: fault.guild.id, name: fault.guild.name } : undefined,
        user: fault.user ? { id: fault.user.id, username: fault.user.username } : undefined
    };
}

function metadataFor(fault: ErrorOrigin): unknown {
    if (fault.event) return { eventName: fault.event.name, handler: fault.event.handler, args: fault.event.args };
    return fault.metadata;
}

function buildEventSource(event: EventOrigin, fault: ErrorOrigin): EventFaultSource {
    return {
        kind: 'event',
        eventName: event.name,
        handler: event.handler,
        userId: fault.user?.id ?? null,
        guildId: fault.guild?.id ?? null,
        channelId: event.channelId,
        raw: event.args
    };
}

function buildInteractionSource(interaction: Repliables): InteractionFaultSource {
    const command = interaction.isChatInputCommand()
        ? slashRouteOf(interaction)
        : interaction.isContextMenuCommand()
          ? interaction.commandName
          : null;
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
