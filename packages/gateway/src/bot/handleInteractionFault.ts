import { Notice, Silence } from '@seedcord/core';
import { Logger } from '@seedcord/logger';
import { DiscordAPIError } from 'discord.js';

import { ReplySender } from '@bot/ReplySender';
import { slashRouteOf } from '@bUtilities/miscellaneous/slashRouteOf';
import { extractErrorResponse, interactionRoute } from '@miscellaneous/extractErrorResponse';

import { HARMLESS_API_CODES } from './harmlessApiCodes';

import type { ValidInteractionTypes } from '@handlers/BaseHandler';
import type { Core } from '@interfaces/Core';
import type { ReplyResponse } from '@seedcord/types';

const logger = new Logger('InteractionBoundary');

/**
 * The interaction controller boundary. Sorts a throw from any handler-lifecycle phase into the right
 * user reply plus the right bus event. The handler's live {@link ReplySender} replies through its exact ack
 * state, and a middleware or pre-construction throw falls back to a fresh seeded sender.
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
        if (caught.reason !== undefined) logger.debug(`Silence: ${caught.reason}`);
        return;
    }
    if (!Error.isError(caught)) throw caught;

    // empty by default, so every api code from the handler's own work reports
    const ignore = new Set<number | string>(core.config.errors?.ignoreApiCodes ?? []);
    if (caught instanceof DiscordAPIError && ignore.has(caught.code)) {
        logger.debug(`swallowed api code ${caught.code}`);
        return;
    }

    // autocomplete has no reply target, so report through extractErrorResponse and build no sender
    if (interaction.isAutocomplete()) {
        extractErrorResponse(caught, core, {
            guild: interaction.guild,
            user: interaction.user,
            metadata: interaction,
            route: slashRouteOf(interaction)
        });
        return;
    }

    const { response } = extractErrorResponse(caught, core, {
        interaction,
        guild: interaction.guild,
        user: interaction.user,
        metadata: interaction
    });
    const liveSender = sender ?? new ReplySender(interaction, interactionRoute(interaction));
    await sendGuarded(liveSender, response, caught instanceof Notice ? caught.ephemeral : true);
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
