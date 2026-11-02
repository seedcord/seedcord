import { FaultBoundary, reportedWrite } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { DiscordAPIError } from 'discord.js';

import { ReplySender } from '#bot/ReplySender';
import { interactionFaultReport } from '#miscellaneous/faultReports';

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
    const boundary = new FaultBoundary(core, core.config.errors?.ignoreApiCodes, DiscordAPIError, logger);
    const fault = boundary.report(caught, (uuid) => interactionFaultReport(interaction, dispatch, uuid));
    if (!fault) return;
    // discord does not accept a message on an autocomplete. empty choices clear the client's loading spinner.
    if (interaction.isAutocomplete()) {
        await sendEmptyChoices(interaction, core, dispatch);
        return;
    }
    const response = fault.response();
    // the handler's own sender carries its ack state. a middleware throw arrives without one
    const liveSender = sender ?? new ReplySender(interaction, dispatch, core.bus);
    await sendGuarded(() => liveSender.send(response, { ephemeral: fault.ephemeral }));
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
