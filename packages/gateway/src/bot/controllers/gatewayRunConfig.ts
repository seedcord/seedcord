import { DiscordAPIError } from 'discord.js';

import { autocompleteResponder } from '#bot/autocompleteResponder';
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
    return {
        dispatch,
        core,
        event: interaction,
        HandlerCtor,
        middlewares,
        apiError: DiscordAPIError,
        logger,
        interactionId: interaction.id,
        origin: {
            userId: interaction.user.id,
            guildId: interaction.guildId,
            channelId: interaction.channelId,
            userLocale: interaction.locale,
            guildLocale: interaction.guildLocale
        },
        customId: 'customId' in interaction ? interaction.customId : null,
        faultDetails: () => interactionFaultReport(interaction, dispatch),
        target: interaction.isAutocomplete()
            ? { responder: autocompleteResponder(interaction, core, dispatch) }
            : {
                  gateContext: () => interactionGateContext(interaction, core, dispatch),
                  sender: new ReplySender(interaction, dispatch, core.bus)
              }
    };
}
