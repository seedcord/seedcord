import { DiscordAPIError } from '@discordjs/rest';
import { InteractionKind } from '@seedcord/core';
import {
    DispatchContext,
    FaultBoundary,
    outcomeFor,
    queuedMsFor,
    reportDispatch,
    reportedWrite,
    resultFor,
    runAfter,
    runInteractionGates
} from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { InteractionResponseType, InteractionType, Routes } from 'discord-api-types/v10';

import { interactionUser } from '#handlers/interactionUser';
import { RepliableHandler } from '#handlers/RepliableHandler';
import { ReplySender } from '#reply/ReplySender';
import { interactionGateContext } from '#src/gates/context';

import { faultReportOf } from './faultReportOf';

import type {
    ConstructableHandler,
    HandlerConstructor,
    InteractionMiddlewareConstructor
} from '#handlers/constructors';
import type { InteractionMiddleware } from '#handlers/interaction/InteractionMiddleware';
import type { InteractionOf } from '#handlers/interaction/middlewareKinds';
import type { ValidInteractionTypes } from '#handlers/interactionTypes';
import type { Core } from '#interfaces/Core';
import type { ResolvedRoute } from './resolve';
import type { DispatchOutcome, DispatchResult, MiddlewareKind } from '@seedcord/core';
import type { FaultTarget, MiddlewareRegistry } from '@seedcord/core/internal';

// lazy, env binds after this module loads
let dispatchLogger: Logger | undefined;
function logger(): Logger {
    dispatchLogger ??= new Logger('Dispatcher', { channel: 'interactions' });
    return dispatchLogger;
}

interface FaultScope {
    readonly core: Core;
    readonly payload: ValidInteractionTypes;
    readonly dispatch: DispatchContext;
    // null on autocomplete, whose only legal refusal is an empty type 8
    readonly sender: ReplySender | null;
}

// empty choices are the only legal way to clear a pending autocomplete
async function respondEmptyChoices(scope: FaultScope): Promise<void> {
    const telemetry = { bus: scope.core.bus, dispatch: scope.dispatch, interactionId: scope.payload.id };
    await reportedWrite(telemetry, 'respond', () =>
        scope.core.rest.post(Routes.interactionCallback(scope.payload.id, scope.payload.token), {
            body: { type: InteractionResponseType.ApplicationCommandAutocompleteResult, data: { choices: [] } }
        })
    );
}

interface DispatchArgs {
    readonly match: ResolvedRoute;
    readonly payload: ValidInteractionTypes;
    readonly core: Core;
    readonly middlewares: MiddlewareRegistry<InteractionMiddlewareConstructor>;
}

// a fresh sender can still reply the card because nothing is acked yet here
function freshScope(
    match: ResolvedRoute,
    payload: ValidInteractionTypes,
    core: Core,
    dispatch: DispatchContext
): FaultScope {
    const ref = { application_id: payload.application_id, id: payload.id, token: payload.token };
    return {
        core,
        payload,
        dispatch,
        sender: match.kind === InteractionKind.Autocomplete ? null : new ReplySender(ref, core.rest, dispatch, core.bus)
    };
}

function dispatchReporter(
    match: ResolvedRoute,
    payload: ValidInteractionTypes,
    core: Core,
    dispatch: DispatchContext
): (outcome: DispatchOutcome) => void {
    const startedAt = performance.now();
    const queuedMs = queuedMsFor(payload.id);
    return (outcome) => {
        reportDispatch(core.bus, {
            dispatch,
            interactionId: payload.id,
            kind: match.kind,
            outcome,
            userId: interactionUser(payload).id,
            guildId: payload.guild_id ?? null,
            startedAt,
            queuedMs
        });
    };
}

async function answer(caught: unknown, scope: FaultScope, report: (outcome: DispatchOutcome) => void): Promise<void> {
    const { core, dispatch, payload, sender } = scope;
    const boundary = new FaultBoundary(core, core.config.errors?.ignoreApiCodes, DiscordAPIError, logger());
    const target: FaultTarget = sender
        ? { reply: (response, options) => sender.send(response, options) }
        : { clearChoices: () => respondEmptyChoices(scope) };
    await boundary.answer(caught, (uuid) => faultReportOf(payload, dispatch, uuid), target);
    report(outcomeFor(caught));
}

interface BeforeHandler {
    readonly args: DispatchArgs;
    readonly Handler: HandlerConstructor;
    readonly dispatch: DispatchContext;
    readonly scope: FaultScope;
    readonly ran: InteractionMiddleware[];
}

async function runMiddlewares(step: BeforeHandler, kind: MiddlewareKind, sender: ReplySender): Promise<void> {
    const { args, dispatch, ran } = step;
    for (const Middleware of args.middlewares.chainFor(kind)) {
        // chainFor picked this kind. the payload is the one the class declares.
        const event = args.payload as InteractionOf<MiddlewareKind>;
        const instance = new Middleware(event, args.core, dispatch, sender);
        // pushed before the await because a middleware that throws still gets its after()
        ran.push(instance);
        await instance.execute();
    }
}

// a returned value is the throw that stops the dispatch before the handler runs
async function refusalBeforeHandler(step: BeforeHandler): Promise<{ caught: unknown } | null> {
    const { args, scope } = step;
    const { kind } = args.match;

    if (kind !== InteractionKind.Autocomplete && scope.sender) {
        try {
            await runMiddlewares(step, kind, scope.sender);
        } catch (caught) {
            return { caught };
        }
    }

    return gateRefusal(step);
}

// a null return means the refusal is already sent
export async function dispatchInteraction(args: DispatchArgs): Promise<(() => Promise<void>) | null> {
    const { match, payload, core } = args;
    // every fault path below renders against this one context
    const dispatch = new DispatchContext(match.kind, match.route, match.fallback);
    const report = dispatchReporter(match, payload, core, dispatch);

    const Handler = match.ctor;
    logger().trace(`Processing ${paint.sky.bold(dispatch.routeId)} with ${paint.mute(Handler.name)}`);

    let handler: InstanceType<ConstructableHandler>;
    try {
        // in a union of both handler bases, the event parameter is never. the route pairs each kind with its class.
        handler = new (Handler as ConstructableHandler)(payload as never, core, dispatch);
    } catch (caught) {
        await answer(caught, freshScope(match, payload, core, dispatch), report);
        return null;
    }
    const scope: FaultScope = {
        core,
        payload,
        dispatch,
        sender: handler instanceof RepliableHandler ? handler.sender : null
    };

    const ran: InteractionMiddleware[] = [];
    const refusal = await refusalBeforeHandler({ args, Handler, dispatch, scope, ran });
    if (refusal) {
        await answer(refusal.caught, scope, report);
        await runAfter(ran, resultFor(refusal.caught), logger());
        return null;
    }

    return async () => {
        let result: DispatchResult = { outcome: 'handled' };
        try {
            await handler.execute();
            report('handled');
        } catch (caught) {
            result = resultFor(caught);
            await answer(caught, scope, report);
        } finally {
            await runAfter(ran, result, logger());
        }
    };
}

// autocomplete has no reply target. @Gated already rejects a gate on one at compile time.
async function gateRefusal(step: BeforeHandler): Promise<{ caught: unknown } | null> {
    const { Handler, dispatch } = step;
    const { match, payload, core } = step.args;
    // match.kind comes from payload.type in the router. the second clause narrows the payload to Repliables.
    if (match.kind === InteractionKind.Autocomplete || payload.type === InteractionType.ApplicationCommandAutocomplete)
        return null;
    try {
        await runInteractionGates(Handler, interactionGateContext(payload, core, dispatch));
        return null;
    } catch (caught) {
        return { caught };
    }
}
