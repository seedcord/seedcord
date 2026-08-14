import * as crypto from 'node:crypto';

import { Notice, Fault } from '@seedcord/core';
import { PublishDefault } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';

import { slashRouteOf } from '@bot/utilities/miscellaneous/slashRouteOf';

import type { Core } from '@interfaces/Core';
import type { FaultSource, SubscriptionData } from '@seedcord/core';
import type { RenderContext, ReplyResponse, Nullable } from '@seedcord/types';
import type { Repliables } from '@src/handlers/interactionTypes';
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
    routeId: string;
    guild: Nullable<Guild>;
    user: Nullable<User>;
    metadata?: unknown;
}

export interface ExtractedErrorResponse {
    uuid: UUID;
    response: ReplyResponse;
}

export function extractErrorResponse(error: Error, core: Core, origin: ErrorOrigin): ExtractedErrorResponse {
    const uuid = crypto.randomUUID();
    const developerUsername = core.config.notifications?.developerUsername;
    const ctx: RenderContext = developerUsername === undefined ? { uuid } : { uuid, developerUsername };

    if (error instanceof Notice) {
        if (error.report) reportFault(error, core, origin, uuid);
        return { uuid, response: error.render(ctx) };
    }

    reportRawFault(error, core, origin, uuid);

    const override = core.config.errors?.defaultError;
    const response = override ? new override(uuid).render(ctx) : new Fault().render(ctx);

    return { uuid, response };
}

function reportFault(denial: Notice, core: Core, origin: ErrorOrigin, uuid: UUID): void {
    logger.error(`${denial.name}: ${uuid}`, denial);

    if (origin.interaction) {
        core.bus[PublishDefault]('handledException', {
            denial,
            uuid,
            routeId: origin.routeId,
            source: buildInteractionSource(origin.interaction)
        });
    } else if (origin.event) {
        core.bus[PublishDefault]('handledException', {
            denial,
            uuid,
            routeId: origin.routeId,
            source: buildEventSource(origin.event, origin)
        });
    } else {
        // an autocomplete throw has no typed source. unknownException is the only channel left
        core.bus[PublishDefault]('unknownException', {
            uuid,
            error: denial,
            routeId: origin.routeId,
            ...scalarActors(origin),
            metadata: metadataFor(origin)
        });
    }
}

function causeLine(error: Error): string {
    const { cause } = error;
    if (!Error.isError(cause)) return '';
    const [first] = cause.message.split('\n');
    return `\ncaused by ${cause.name}: ${first ?? cause.message}`;
}

function reportRawFault(error: Error, core: Core, origin: ErrorOrigin, uuid: UUID): void {
    const showStack = core.config.errors?.errorStack ?? false;
    if (showStack) logger.error(uuid, error);
    else logger.error(`${uuid} | ${error.message}${causeLine(error)}`);

    core.bus[PublishDefault]('unknownException', {
        uuid,
        error,
        routeId: origin.routeId,
        ...scalarActors(origin),
        metadata: metadataFor(origin)
    });
}

// the bus payload must stay djs-free
function scalarActors(origin: ErrorOrigin): Pick<SubscriptionData<'unknownException'>, 'guild' | 'user'> {
    return {
        guild: origin.guild ? { id: origin.guild.id, name: origin.guild.name } : undefined,
        user: origin.user ? { id: origin.user.id, username: origin.user.username } : undefined
    };
}

function metadataFor(origin: ErrorOrigin): unknown {
    if (origin.event) return { eventName: origin.event.name, handler: origin.event.handler, args: origin.event.args };
    return origin.metadata;
}

function buildEventSource(event: EventOrigin, origin: ErrorOrigin): EventFaultSource {
    return {
        kind: 'event',
        eventName: event.name,
        handler: event.handler,
        userId: origin.user?.id ?? null,
        guildId: origin.guild?.id ?? null,
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
