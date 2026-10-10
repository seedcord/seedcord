import { Notice, Silence } from '@seedcord/core';
import { reportedWrite } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { asError } from '@seedcord/utils/internal';
import { DiscordAPIError } from 'discord.js';

import { ReplySender } from '#bot/ReplySender';
import { extractErrorResponse } from '#miscellaneous/extractErrorResponse';

import { HARMLESS_API_CODES } from './harmlessApiCodes';

import type { Core } from '#interfaces/Core';
import type { ValidInteractionTypes } from '#src/handlers/interactionTypes';
import type { DispatchContext } from '@seedcord/core';
import type { ReplyResponse } from '@seedcord/types';
import type { AutocompleteInteraction } from 'discord.js';

const logger = new Logger('Faults', { channel: 'errors' });

export async function handleInteractionFault(
    caught: unknown,
    interaction: ValidInteractionTypes,
    core: Core,
    dispatch: DispatchContext,
    sender?: ReplySender
): Promise<void> {
    const { routeId } = dispatch;
    if (caught instanceof Silence) {
        if (caught.reason !== undefined && (core.config.errors?.logSilences ?? true)) {
            logger.debug(`Silence: ${caught.reason}`);
        }
        return;
    }
    const error = asError(caught);

    const ignore = new Set<number | string>(core.config.errors?.ignoreApiCodes ?? []);
    if (error instanceof DiscordAPIError && ignore.has(error.code)) {
        logger.debug(`swallowed api code ${error.code}`);
        return;
    }

    // discord does not accept a message on an autocomplete. the fault is only reported.
    if (interaction.isAutocomplete()) {
        extractErrorResponse(error, core, {
            origin: routeId,
            dispatch,
            guild: interaction.guild,
            user: interaction.user,
            metadata: interaction
        });
        // empty choices clear the client's loading spinner
        await sendEmptyChoices(interaction, core, dispatch);
        return;
    }

    const { response } = extractErrorResponse(error, core, {
        interaction,
        origin: routeId,
        dispatch,
        guild: interaction.guild,
        user: interaction.user,
        metadata: interaction
    });
    // the handler's own sender carries its ack state. a middleware throw arrives without one
    const liveSender = sender ?? new ReplySender(interaction, dispatch, core.bus);
    await sendGuarded(liveSender, response, error instanceof Notice ? error.ephemeral : true);
}

async function sendEmptyChoices(
    interaction: AutocompleteInteraction,
    core: Core,
    dispatch: DispatchContext
): Promise<void> {
    const telemetry = { bus: core.bus, dispatch, interactionId: interaction.id };
    try {
        await reportedWrite(telemetry, 'respond', () => interaction.respond([]));
    } catch (error) {
        logger.debug(`autocomplete empty-choices send failed: ${String(error)}`);
    }
}

// only this send swallows the harmless codes. a handler's own write still reports them
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
