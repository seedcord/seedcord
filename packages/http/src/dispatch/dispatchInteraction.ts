import { DiscordAPIError } from '@discordjs/rest';
import { DispatchContext, InteractionRun } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { InteractionType } from 'discord-api-types/v10';

import { interactionUser } from '#handlers/interactionUser';
import { autocompleteResponder } from '#reply/autocompleteResponder';
import { ReplySender } from '#reply/ReplySender';
import { interactionGateContext } from '#src/gates/context';

import { interactionFaultReport } from './interactionFaultReport';

import type { InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { ValidInteractionTypes } from '#handlers/interactionTypes';
import type { Core } from '#interfaces/Core';
import type { ResolvedRoute } from './resolve';
import type { InteractionRunConfig, MiddlewareRegistry } from '@seedcord/core/internal';

// lazy, env binds after this module loads
let dispatchLogger: Logger | undefined;
function logger(): Logger {
    dispatchLogger ??= new Logger('Dispatcher', { channel: 'interactions' });
    return dispatchLogger;
}

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
        userId: interactionUser(payload).id,
        guildId: payload.guild_id ?? null,
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

export function dispatchInteraction(args: DispatchArgs): Promise<(() => Promise<void>) | null> {
    return new InteractionRun(httpRunConfig(args)).prepare();
}
