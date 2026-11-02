import { Notice, Silence } from '@seedcord/core';
import { faultResponse, reportedWrite, reportFault } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { asError } from '@seedcord/utils/internal';
import { DiscordAPIError } from 'discord.js';

import { ReplySender } from '#bot/ReplySender';
import { faultReportOf } from '#miscellaneous/faultReportOf';

import { HARMLESS_API_CODES } from './harmlessApiCodes';

import type { Core } from '#interfaces/Core';
import type { ValidInteractionTypes } from '#src/handlers/interactionTypes';
import type { DispatchContext } from '@seedcord/core';
import type { AutocompleteInteraction } from 'discord.js';

const logger = new Logger('Faults', { channel: 'errors' });

export async function handleInteractionFault(
    caught: unknown,
    interaction: ValidInteractionTypes,
    core: Core,
    dispatch: DispatchContext,
    sender?: ReplySender
): Promise<void> {
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

    const uuid = crypto.randomUUID();
    reportFault(
        core.bus,
        core.config.errors,
        error,
        faultReportOf({ kind: 'interaction', interaction, dispatch }, uuid)
    );
    // discord does not accept a message on an autocomplete. empty choices clear the client's loading spinner.
    if (interaction.isAutocomplete()) {
        await sendEmptyChoices(interaction, core, dispatch);
        return;
    }
    const response = faultResponse(error, uuid, dispatch, core.config);
    // the handler's own sender carries its ack state. a middleware throw arrives without one
    const liveSender = sender ?? new ReplySender(interaction, dispatch, core.bus);
    await sendGuarded(() => liveSender.send(response, { ephemeral: error instanceof Notice ? error.ephemeral : true }));
}

async function sendEmptyChoices(
    interaction: AutocompleteInteraction,
    core: Core,
    dispatch: DispatchContext
): Promise<void> {
    const telemetry = { bus: core.bus, dispatch, interactionId: interaction.id };
    await sendGuarded(() => reportedWrite(telemetry, 'respond', () => interaction.respond([])));
}

// only this send swallows the harmless codes. a handler's own write still reports them
async function sendGuarded(send: () => Promise<unknown>): Promise<void> {
    try {
        await send();
    } catch (error) {
        if (error instanceof DiscordAPIError && HARMLESS_API_CODES.has(error.code)) {
            logger.debug(`reply send hit harmless code ${error.code}`);
            return;
        }
        logger.error('fault response send failed', error);
    }
}
