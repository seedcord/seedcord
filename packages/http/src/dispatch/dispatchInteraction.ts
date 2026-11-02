import { DiscordAPIError } from '@discordjs/rest';
import { InteractionKind } from '@seedcord/core';
import {
    DispatchContext,
    FaultBoundary,
    InteractionRun,
    reportedWrite,
    runInteractionGates
} from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { InteractionResponseType, Routes } from 'discord-api-types/v10';

import { interactionUser } from '#handlers/interactionUser';
import { RepliableHandler } from '#handlers/RepliableHandler';
import { ReplySender } from '#reply/ReplySender';
import { interactionGateContext } from '#src/gates/context';

import { faultReportOf } from './faultReportOf';

import type { ConstructableHandler, InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { InteractionOf } from '#handlers/interaction/middlewareKinds';
import type { Repliables, ValidInteractionTypes } from '#handlers/interactionTypes';
import type { Core } from '#interfaces/Core';
import type { ResolvedRoute } from './resolve';
import type { MiddlewareKind } from '@seedcord/core';
import type { FaultTarget, InteractionRunAdapter, MiddlewareRegistry } from '@seedcord/core/internal';

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

function faultTarget(
    payload: ValidInteractionTypes,
    core: Core,
    dispatch: DispatchContext<InteractionKind>,
    sender: ReplySender | undefined
): FaultTarget {
    if (dispatch.kind === InteractionKind.Autocomplete) {
        const telemetry = { bus: core.bus, dispatch, interactionId: payload.id };
        return {
            clearChoices: () =>
                reportedWrite(telemetry, 'respond', () =>
                    core.rest.post(Routes.interactionCallback(payload.id, payload.token), {
                        body: {
                            type: InteractionResponseType.ApplicationCommandAutocompleteResult,
                            data: { choices: [] }
                        }
                    })
                )
        };
    }
    // a fresh sender can still reply the card because nothing is acked yet when the constructor threw
    const ref = { application_id: payload.application_id, id: payload.id, token: payload.token };
    const replySender = sender ?? new ReplySender(ref, core.rest, dispatch, core.bus);
    return { reply: (response, options) => replySender.send(response, options) };
}

function httpRunAdapter(args: DispatchArgs): InteractionRunAdapter<ReplySender> {
    const { match, payload, core, middlewares } = args;
    // every fault path renders against this one context
    const dispatch = new DispatchContext(match.kind, match.route, match.fallback);
    const Handler = match.ctor;
    return {
        dispatch,
        logger: logger(),
        bus: core.bus,
        interactionId: payload.id,
        userId: interactionUser(payload).id,
        guildId: payload.guild_id ?? null,
        buildHandler() {
            logger().trace(`Processing ${paint.sky.bold(dispatch.routeId)} with ${paint.mute(Handler.name)}`);
            // in a union of both handler bases, the event parameter is never. the route pairs each kind with its class.
            return new (Handler as ConstructableHandler)(payload as never, core, dispatch);
        },
        senderOf: (handler) => (handler instanceof RepliableHandler ? handler.sender : undefined),
        *middlewares(kind, sender) {
            for (const Middleware of middlewares.chainFor(kind)) {
                // chainFor picked this kind. the payload is the one the class declares.
                yield new Middleware(payload as InteractionOf<MiddlewareKind>, core, dispatch, sender);
            }
        },
        // justified: the run skips gates on autocomplete, the one payload outside Repliables
        runGates: () => runInteractionGates(Handler, interactionGateContext(payload as Repliables, core, dispatch)),
        answer: async (caught, sender) => {
            const boundary = new FaultBoundary(core, core.config.errors?.ignoreApiCodes, DiscordAPIError);
            await boundary.answer(
                caught,
                (uuid) => faultReportOf(payload, dispatch, uuid),
                faultTarget(payload, core, dispatch, sender)
            );
        }
    };
}

// a null return means the refusal is already sent
export function dispatchInteraction(args: DispatchArgs): Promise<(() => Promise<void>) | null> {
    return new InteractionRun(httpRunAdapter(args)).prepare();
}
