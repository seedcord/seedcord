import * as crypto from 'node:crypto';

import { Denial, Fault } from '@seedcord/kit';
import { prefixOf } from '@seedcord/kit/internal';
import { Logger } from '@seedcord/services';
import { DiscordAPIError } from 'discord.js';

import { slashRouteOf } from '@bot/utilities/miscellaneous/slashRouteOf';
import { FaultThrottle } from '@miscellaneous/FaultThrottle';

import type { Repliables } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';
import type { RenderContext, ReplyResponse, Nullable } from '@seedcord/types';
import type { EventFaultSource, InteractionFaultSource } from '@subscribers/types/Subscriptions';
import type { Guild, User } from 'discord.js';
import type { UUID } from 'node:crypto';

const logger = new Logger('ErrorsHandling');

/**
 * The single throttle for every fault publish, so a recurring fault reports once per window across both
 * the interaction and event paths. Exported so tests reset it between cases.
 *
 * @internal
 */
export const faultThrottle = new FaultThrottle();

/**
 * A fault that came from a client event. The event boundary derives the actor and channel best-effort.
 *
 * @internal
 */
export interface EventOrigin {
    name: string;
    handler: string;
    args: unknown;
    channelId: string | null;
}

/**
 * Where an error came from. `interaction` sets the interaction `handledException` source, `event` sets
 * the event source. guild/user back the `unknownException` payload on every path.
 *
 * @internal
 */
export interface ErrorOrigin {
    interaction?: Repliables;
    event?: EventOrigin;
    /** The route, for the throttle key when there is no repliable interaction or event (autocomplete). */
    route?: string;
    guild: Nullable<Guild>;
    user: Nullable<User>;
    metadata?: unknown;
}

/**
 * Structure representing the extracted error response.
 *
 * @internal
 */
export interface ExtractedErrorResponse {
    /** The unique identifier for the error instance */
    uuid: UUID;
    /** The rendered reply to send to the user */
    response: ReplyResponse;
}

/**
 * Processes an error into a user-facing reply and routes its report.
 *
 * A {@link Denial} always renders its own reply. A reporting denial (`report: true`) additionally
 * publishes `handledException` on the interaction path. A raw, non-denial throw publishes
 * `unknownException` and renders the configured `defaultError` (or a generic {@link Fault}). One uuid is
 * threaded into both the reply and the bus payload.
 *
 * @internal
 */
export function extractErrorResponse(error: Error, core: Core, origin: ErrorOrigin): ExtractedErrorResponse {
    const uuid = crypto.randomUUID();
    const developerUsername = core.config.notifications?.developerUsername;
    const ctx: RenderContext = developerUsername === undefined ? { uuid } : { uuid, developerUsername };

    if (error instanceof Denial) {
        if (error.report) reportFault(error, core, origin, uuid);
        return { uuid, response: error.render(ctx) };
    }

    reportRawFault(error, core, origin, uuid);

    const override = core.config.errors?.defaultError;
    const response = override ? new override(uuid).render(ctx) : new Fault().render(ctx);

    return { uuid, response };
}

// the throttle protocol both report paths share: report once per window per key, stamp only on a report
function withThrottle(origin: ErrorOrigin, error: Error, publish: () => void): void {
    const key = faultKey(origin, error);
    if (!faultThrottle.shouldReport(key)) {
        logger.info(`throttled duplicate fault ${key}`);
        return;
    }
    publish();
    faultThrottle.markReported(key);
}

function reportFault(denial: Denial, core: Core, origin: ErrorOrigin, uuid: UUID): void {
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
                guild: origin.guild,
                user: origin.user,
                metadata: metadataFor(origin)
            });
        }
    });
}

function reportRawFault(error: Error, core: Core, origin: ErrorOrigin, uuid: UUID): void {
    withThrottle(origin, error, () => {
        const showStack = core.config.errors?.errorStack ?? false;
        if (showStack) logger.error(uuid, error);
        else logger.error(`${uuid} | ${error.message}`);

        core.bus.publish('unknownException', {
            uuid,
            error,
            guild: origin.guild,
            user: origin.user,
            metadata: metadataFor(origin)
        });
    });
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
        error instanceof Denial
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

function interactionRoute(interaction: Repliables): string {
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
