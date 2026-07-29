import * as crypto from 'node:crypto';

import { Notice, Fault } from '@seedcord/core';
import { prefixOf } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { DiscordAPIError } from 'discord.js';

import { slashRouteOf } from '@bot/utilities/miscellaneous/slashRouteOf';
import { FaultThrottle } from '@miscellaneous/FaultThrottle';

import type { Core } from '@interfaces/Core';
import type { FaultSource, SubscriptionData } from '@seedcord/core';
import type { RenderContext, ReplyResponse, Nullable } from '@seedcord/types';
import type { Repliables } from '@src/handlers/interactionTypes';
import type { Guild, User } from 'discord.js';
import type { UUID } from 'node:crypto';

type InteractionFaultSource = Extract<FaultSource, { kind: 'interaction' }>;
type EventFaultSource = Extract<FaultSource, { kind: 'event' }>;

const logger = new Logger('ErrorsHandling');

// one throttle across both report paths, so a recurring fault reports once per window. exported so
// tests reset the shared window state.
export const faultThrottle = new FaultThrottle();

interface EventOrigin {
    name: string;
    handler: string;
    args: unknown;
    channelId: string | null;
}

export interface ErrorOrigin {
    interaction?: Repliables;
    event?: EventOrigin;
    /** The route, for the throttle key when there is no repliable interaction or event (autocomplete). */
    route?: string;
    guild: Nullable<Guild>;
    user: Nullable<User>;
    metadata?: unknown;
}

export interface ExtractedErrorResponse {
    uuid: UUID;
    response: ReplyResponse;
}

/**
 * Processes an error into a user-facing reply and routes its report.
 *
 * A {@link Notice} always renders its own reply. A reporting denial (`report: true`) additionally
 * publishes `handledException` on the interaction path. A raw, non-denial throw publishes
 * `unknownException` and renders the configured `defaultError` (or a generic {@link Fault}). One uuid is
 * threaded into both the reply and the bus payload.
 */
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

// stamp only after a publish, so a throttled fault stays reportable next window
function withThrottle(origin: ErrorOrigin, error: Error, publish: () => void): void {
    const key = faultKey(origin, error);
    if (!faultThrottle.shouldReport(key)) {
        logger.info(`throttled duplicate fault ${key}`);
        return;
    }
    publish();
    faultThrottle.markReported(key);
}

function reportFault(denial: Notice, core: Core, origin: ErrorOrigin, uuid: UUID): void {
    withThrottle(origin, denial, () => {
        logger.error(`${denial.name}: ${uuid}`, denial);

        if (origin.interaction) {
            core.bus.publish('handledException', { denial, uuid, source: buildInteractionSource(origin.interaction) });
        } else if (origin.event) {
            core.bus.publish('handledException', { denial, uuid, source: buildEventSource(origin.event, origin) });
        } else {
            // autocomplete has no reply target and no typed source, so report through unknownException
            core.bus.publish('unknownException', {
                uuid,
                error: denial,
                ...scalarActors(origin),
                metadata: metadataFor(origin)
            });
        }
    });
}

function causeLine(error: Error): string {
    const { cause } = error;
    if (!Error.isError(cause)) return '';
    const [first] = cause.message.split('\n');
    return `\ncaused by ${cause.name}: ${first ?? cause.message}`;
}

function reportRawFault(error: Error, core: Core, origin: ErrorOrigin, uuid: UUID): void {
    withThrottle(origin, error, () => {
        const showStack = core.config.errors?.errorStack ?? false;
        if (showStack) logger.error(uuid, error);
        else logger.error(`${uuid} | ${error.message}${causeLine(error)}`);

        core.bus.publish('unknownException', {
            uuid,
            error,
            ...scalarActors(origin),
            metadata: metadataFor(origin)
        });
    });
}

// the bus payload must stay djs-free, so map to plain scalars
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

// the stable route plus the error name, so a parameterized component or a flooding event collapses to one key
function faultKey(origin: ErrorOrigin, error: Error): string {
    const name =
        error instanceof Notice
            ? error.name
            : error instanceof DiscordAPIError
              ? String(error.code)
              : error.constructor.name;
    if (origin.event) return `${origin.event.name}:${origin.event.handler}:${name}`;
    if (origin.interaction) return `${interactionRoute(origin.interaction)}:${name}`;
    // autocomplete, namespaced so it never collides with a same-named slash command
    if (origin.route) return `autocomplete:${origin.route}:${name}`;
    return `autocomplete:${name}`;
}

/** The stable route id of a repliable interaction, its slash route path, command name, or customId prefix. */
export function interactionRoute(interaction: Repliables): string {
    if (interaction.isChatInputCommand()) return slashRouteOf(interaction);
    if (interaction.isContextMenuCommand()) return interaction.commandName;
    if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
        // || not ??, an empty prefix (a too-short routeKey) must fall back to the full wire
        return prefixOf(interaction.customId) || interaction.customId;
    }
    return 'interaction';
}

function buildInteractionSource(interaction: Repliables): InteractionFaultSource {
    // the full slash route (with subcommand) so two subcommands of one parent do not share a key
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
