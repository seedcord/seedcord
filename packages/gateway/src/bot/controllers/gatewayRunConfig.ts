import { reportedWrite } from '@seedcord/core/internal';
import { DiscordAPIError } from 'discord.js';

import { interactionGateContext } from '#bot/gates/context';
import { ReplySender } from '#bot/ReplySender';
import { interactionFaultReport } from '#miscellaneous/faultReports';

import type { HandlerConstructor, InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { Core } from '#interfaces/Core';
import type { Repliables, ValidInteractionTypes } from '#src/handlers/interactionTypes';
import type { InteractionDispatch, InteractionRunConfig, MiddlewareRegistry } from '@seedcord/core/internal';
import type { Logger } from '@seedcord/logger';
import type { AutocompleteInteraction } from 'discord.js';

interface GatewayRun {
    readonly interaction: ValidInteractionTypes;
    readonly core: Core;
    readonly dispatch: InteractionDispatch;
    readonly HandlerCtor: HandlerConstructor;
    readonly middlewares: MiddlewareRegistry<InteractionMiddlewareConstructor>;
    readonly logger: Logger;
}

export function gatewayRunConfig(run: GatewayRun): InteractionRunConfig<ReplySender> {
    const { interaction, core, dispatch, HandlerCtor, middlewares, logger } = run;
    // justified: the run calls these two only on a repliable kind
    const repliable = interaction as Repliables;
    return {
        dispatch,
        core,
        event: interaction,
        HandlerCtor,
        middlewares,
        apiError: DiscordAPIError,
        logger,
        interactionId: interaction.id,
        userId: interaction.user.id,
        guildId: interaction.guildId,
        gateContext: () => interactionGateContext(repliable, core, dispatch),
        faultDetails: () => interactionFaultReport(interaction, dispatch),
        newSender: () => new ReplySender(repliable, dispatch, core.bus),
        clearChoices: () => {
            const telemetry = { bus: core.bus, dispatch, interactionId: interaction.id };
            // justified: the run calls this only on autocomplete
            return reportedWrite(telemetry, 'respond', () => (interaction as AutocompleteInteraction).respond([]));
        }
    };
}
