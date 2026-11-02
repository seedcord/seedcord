import { DiscordAPIError } from '@discordjs/rest';
import { DispatchContext, InteractionRun, reportedWrite } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';
import { InteractionResponseType, Routes } from 'discord-api-types/v10';

import { interactionUser } from '#handlers/interactionUser';
import { ReplySender } from '#reply/ReplySender';
import { interactionGateContext } from '#src/gates/context';

import { interactionFaultReport } from './interactionFaultReport';

import type { InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { Repliables, ValidInteractionTypes } from '#handlers/interactionTypes';
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

function httpRunConfig(args: DispatchArgs): InteractionRunConfig<ReplySender> {
    const { match, payload, core, middlewares } = args;
    // every fault path renders against this one context
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
        // justified: the run skips gates on autocomplete, the one payload outside Repliables
        gateContext: () => interactionGateContext(payload as Repliables, core, dispatch),
        faultDetails: () => interactionFaultReport(payload, dispatch),
        newSender() {
            const ref = { application_id: payload.application_id, id: payload.id, token: payload.token };
            return new ReplySender(ref, core.rest, dispatch, core.bus);
        },
        clearChoices() {
            const telemetry = { bus: core.bus, dispatch, interactionId: payload.id };
            return reportedWrite(telemetry, 'respond', () =>
                core.rest.post(Routes.interactionCallback(payload.id, payload.token), {
                    body: {
                        type: InteractionResponseType.ApplicationCommandAutocompleteResult,
                        data: { choices: [] }
                    }
                })
            );
        }
    };
}

export function dispatchInteraction(args: DispatchArgs): Promise<(() => Promise<void>) | null> {
    return new InteractionRun(httpRunConfig(args)).prepare();
}
