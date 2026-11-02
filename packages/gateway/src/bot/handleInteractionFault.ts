import { FaultBoundary, reportedWrite } from '@seedcord/core/internal';
import { DiscordAPIError } from 'discord.js';

import { ReplySender } from '#bot/ReplySender';
import { interactionFaultReport } from '#miscellaneous/faultReports';

import type { Core } from '#interfaces/Core';
import type { ValidInteractionTypes } from '#src/handlers/interactionTypes';
import type { DispatchContext } from '@seedcord/core';
import type { FaultTarget } from '@seedcord/core/internal';

export async function handleInteractionFault(
    caught: unknown,
    interaction: ValidInteractionTypes,
    core: Core,
    dispatch: DispatchContext,
    sender?: ReplySender
): Promise<void> {
    const boundary = new FaultBoundary(core, core.config.errors?.ignoreApiCodes, DiscordAPIError);
    await boundary.answer(
        caught,
        (uuid) => interactionFaultReport(interaction, dispatch, uuid),
        faultTarget(interaction, core, dispatch, sender)
    );
}

function faultTarget(
    interaction: ValidInteractionTypes,
    core: Core,
    dispatch: DispatchContext,
    sender?: ReplySender
): FaultTarget {
    if (interaction.isAutocomplete()) {
        const telemetry = { bus: core.bus, dispatch, interactionId: interaction.id };
        return { clearChoices: () => reportedWrite(telemetry, 'respond', () => interaction.respond([])) };
    }
    return {
        // the handler's own sender carries its ack state. a constructor throw arrives without one
        reply: (response, options) =>
            (sender ?? new ReplySender(interaction, dispatch, core.bus)).send(response, options)
    };
}
