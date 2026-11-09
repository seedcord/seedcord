import { DiscordAPIError } from '@discordjs/rest';
import { DispatchContext, InteractionRun, lazyLogger } from '@seedcord/core/internal';
import { InteractionType } from 'discord-api-types/v10';

import { autocompleteResponder } from '#reply/autocompleteResponder';
import { ReplySender } from '#reply/ReplySender';
import { interactionGateContext, interactionOrigin } from '#src/gates/context';

import { interactionFaultReport } from './interactionFaultReport';

import type { InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { ValidInteractionTypes } from '#handlers/interactionTypes';
import type { Core } from '#interfaces/Core';
import type { ResolvedRoute } from './resolve';
import type { InteractionRunConfig, MiddlewareRegistry } from '@seedcord/core/internal';

const logger = lazyLogger('Interactions', { channel: 'interactions' });

interface DispatchArgs {
    readonly match: ResolvedRoute;
    readonly payload: ValidInteractionTypes;
    readonly core: Core;
    readonly middlewares: MiddlewareRegistry<InteractionMiddlewareConstructor>;
}

function httpRunConfig(args: DispatchArgs): InteractionRunConfig {
    const { match, payload, core, middlewares } = args;
    const dispatch = new DispatchContext(match.kind, match.route, match.fallback);
    return {
        dispatch,
        core,
        event: payload,
        HandlerCtor: match.ctor,
        middlewares,
        apiError: DiscordAPIError,
        logger: logger(),
        interactionId: payload.id,
        origin: interactionOrigin(payload),
        customId: 'custom_id' in payload.data ? payload.data.custom_id : null,
        faultDetails: () => interactionFaultReport(payload, dispatch),
        target:
            payload.type === InteractionType.ApplicationCommandAutocomplete
                ? { responder: autocompleteResponder(payload, core, dispatch) }
                : {
                      gateContext: () => interactionGateContext(payload, core, dispatch),
                      sender: new ReplySender(
                          { application_id: payload.application_id, id: payload.id, token: payload.token },
                          core.rest,
                          dispatch,
                          core.bus
                      )
                  }
    };
}

export function dispatchInteraction(args: DispatchArgs): ReturnType<InteractionRun['prepare']> {
    return new InteractionRun(httpRunConfig(args)).prepare();
}
