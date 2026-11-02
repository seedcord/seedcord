import { reportedWrite } from '@seedcord/core/internal';
import { DiscordAPIError } from 'discord.js';

import { interactionGateContext } from '#bot/gates/context';
import { ReplySender } from '#bot/ReplySender';
import { interactionFaultReport } from '#miscellaneous/faultReports';

import type { HandlerConstructor, InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { Core } from '#interfaces/Core';
import type { ValidInteractionTypes } from '#src/handlers/interactionTypes';
import type { InteractionDispatch, InteractionRunConfig, MiddlewareRegistry } from '@seedcord/core/internal';
import type { Logger } from '@seedcord/logger';

interface GatewayRun {
    readonly interaction: ValidInteractionTypes;
    readonly core: Core;
    readonly dispatch: InteractionDispatch;
    readonly HandlerCtor: HandlerConstructor;
    readonly middlewares: MiddlewareRegistry<InteractionMiddlewareConstructor>;
    readonly logger: Logger;
}

export function gatewayRunConfig(run: GatewayRun): InteractionRunConfig {
    const { interaction, core, dispatch, HandlerCtor, middlewares, logger } = run;
    const telemetry = { bus: core.bus, dispatch, interactionId: interaction.id };
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
        faultDetails: () => interactionFaultReport(interaction, dispatch),
        target: interaction.isAutocomplete()
            ? { clearChoices: () => reportedWrite(telemetry, 'respond', () => interaction.respond([])) }
            : {
                  gateContext: () => interactionGateContext(interaction, core, dispatch),
                  newSender: () => new ReplySender(interaction, dispatch, core.bus)
              }
    };
}
