import { Notice, Silence } from '@seedcord/core';
import { asError, attemptWrite, publishResponse } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { DiscordAPIError } from 'discord.js';

import { ReplySender } from '@bot/ReplySender';
import { slashRouteOf } from '@bUtilities/miscellaneous/slashRouteOf';
import { extractErrorResponse, interactionRoute } from '@miscellaneous/extractErrorResponse';

import { HARMLESS_API_CODES } from './harmlessApiCodes';

import type { Core } from '@interfaces/Core';
import type { ReplyResponse } from '@seedcord/types';
import type { ValidInteractionTypes } from '@src/handlers/interactionTypes';
import type { AutocompleteInteraction } from 'discord.js';

const logger = new Logger('InteractionBoundary');

/**
 * The interaction controller boundary. Sorts a throw from any handler-lifecycle phase into the right
 * user reply plus the right bus event. When a handler is built its sender is passed in, so the boundary
 * sends from the current ack state. A middleware or pre-construction throw arrives with no sender, so the
 * boundary builds one from the interaction flags.
 *
 * @internal
 */
export async function handleInteractionFault(
    caught: unknown,
    interaction: ValidInteractionTypes,
    core: Core,
    sender?: ReplySender
): Promise<void> {
    if (caught instanceof Silence) {
        if (caught.reason !== undefined && (core.config.errors?.logSilences ?? true)) {
            logger.debug(`Silence: ${caught.reason}`);
        }
        return;
    }
    const error = asError(caught);

    // empty by default, so every api code from the handler's own work reports
    const ignore = new Set<number | string>(core.config.errors?.ignoreApiCodes ?? []);
    if (error instanceof DiscordAPIError && ignore.has(error.code)) {
        logger.debug(`swallowed api code ${error.code}`);
        return;
    }

    // autocomplete has no reply target, so report through extractErrorResponse and build no sender
    if (interaction.isAutocomplete()) {
        extractErrorResponse(error, core, {
            guild: interaction.guild,
            user: interaction.user,
            metadata: interaction,
            route: slashRouteOf(interaction)
        });
        // empty choices are the only legal response, and they clear the client's loading spinner
        await sendEmptyChoices(interaction, core);
        return;
    }

    const { response } = extractErrorResponse(error, core, {
        interaction,
        guild: interaction.guild,
        user: interaction.user,
        metadata: interaction
    });
    const liveSender = sender ?? new ReplySender(interaction, interactionRoute(interaction), core.bus);
    await sendGuarded(liveSender, response, error instanceof Notice ? error.ephemeral : true);
}

// reports like any other write, so a faulted autocomplete still shows its discord round trip
async function sendEmptyChoices(interaction: AutocompleteInteraction, core: Core): Promise<void> {
    const telemetry = { bus: core.bus, interactionId: interaction.id };
    const routeId = `autocomplete:${slashRouteOf(interaction)}`;
    const startedAt = performance.now();
    try {
        await attemptWrite(telemetry, routeId, 'respond', startedAt, () => interaction.respond([]));
        publishResponse(telemetry, { routeId, method: 'respond', startedAt, outcome: 'sent', messageId: null });
    } catch (error) {
        logger.debug(`autocomplete empty-choices send failed: ${String(error)}`);
    }
}

// the boundary's own send drops the harmless reply-token codes so a dead token never escapes it
async function sendGuarded(sender: ReplySender, response: ReplyResponse, ephemeral: boolean): Promise<void> {
    try {
        await sender.send(response, { ephemeral });
    } catch (error) {
        if (error instanceof DiscordAPIError && HARMLESS_API_CODES.has(error.code)) {
            logger.debug(`reply send hit harmless code ${error.code}`);
            return;
        }
        logger.error('reply send failed', error);
    }
}
