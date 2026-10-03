import { DiscordAPIError, REST } from '@discordjs/rest';
import { Bus, DispatchContext, Fault, InteractionKind, Notice, Silence } from '@seedcord/core';
import {
    asError,
    outcomeFor,
    queuedMsFor,
    reportDispatch,
    reportedWrite,
    resultFor,
    runAfter,
    runHandlerGates,
    slowGateMonitor
} from '@seedcord/core/internal';
import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { applicationIdFromToken, SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { InteractionResponseType, InteractionType, RESTJSONErrorCodes, Routes } from 'discord-api-types/v10';

import { RepliableHandler } from '#handlers/RepliableHandler';
import { ReplySender } from '#reply/ReplySender';
import { interactionGateContext } from '#src/gates/context';

import { reportFault } from './reportFault';

import type {
    ConstructableHandler,
    HandlerConstructor,
    InteractionMiddlewareConstructor
} from '#handlers/constructors';
import type { InteractionMiddleware } from '#handlers/interaction/InteractionMiddleware';
import type { InteractionOf } from '#handlers/interaction/middlewareKinds';
import type { ValidInteractionTypes } from '#handlers/interactionTypes';
import type { HttpConfig } from '#interfaces/Config';
import type { Core } from '#interfaces/Core';
import type { ResolvedRoute } from './resolve';
import type { DispatchOutcome, DispatchResult, MiddlewareKind } from '@seedcord/core';
import type { MiddlewareRegistry } from '@seedcord/core/internal';
import type { CoordinatedShutdown, CoordinatedStartup } from '@seedcord/core/node';
import type { IRateLimiter, RenderContext, TypedOmit } from '@seedcord/types';

// lazy, env binds after this module loads
let dispatchLogger: Logger | undefined;
function logger(): Logger {
    dispatchLogger ??= new Logger('Dispatcher', { channel: 'interactions' });
    return dispatchLogger;
}

type CoreDraft = TypedOmit<Core, 'bus'> & { bus: Bus };

function noLifecycle(accessor: string): never {
    throw new SeedcordError(SeedcordErrorCode.CoreLifecycleUnavailable, [accessor]);
}

const edgeShutdown: Pick<CoordinatedShutdown, 'addTask'> = { addTask: () => noLifecycle('shutdown') };
const edgeStartup: Pick<CoordinatedStartup, 'addTask'> = { addTask: () => noLifecycle('startup') };

export function createCore(config: HttpConfig, token: string): Core {
    const rateLimiter: IRateLimiter = config.store ?? new MemoryRateLimiter();
    // justified: bus completes the shape on the next line. the Bus reads core at dispatch, never here.
    const draft = {
        config,
        rateLimiter,
        rest: new REST().setToken(token),
        shutdown: edgeShutdown,
        startup: edgeStartup,
        get applicationId(): string {
            return applicationIdFromToken(token);
        }
    } as CoreDraft;
    draft.bus = new Bus(draft);
    return draft;
}

interface FaultScope {
    readonly core: Core;
    readonly payload: ValidInteractionTypes;
    readonly routeId: string;
    readonly dispatch: DispatchContext;
    // null on autocomplete, whose only legal refusal is an empty type 8
    readonly sender: ReplySender | null;
}

// each one means the interaction is already gone
const HARMLESS_API_CODES: ReadonlySet<number | string> = new Set([
    RESTJSONErrorCodes.UnknownInteraction,
    RESTJSONErrorCodes.InteractionHasAlreadyBeenAcknowledged,
    RESTJSONErrorCodes.UnknownMessage
]);

async function sendGuarded(routeId: string, send: () => Promise<unknown>): Promise<void> {
    try {
        await send();
    } catch (error) {
        if (error instanceof DiscordAPIError && HARMLESS_API_CODES.has(error.code)) {
            logger().debug(`boundary send hit harmless code ${paint.amber(String(error.code))}`);
            return;
        }
        logger().error(`boundary send failed for route ${paint.sky.bold(routeId)}`, error);
    }
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

function renderContext(scope: FaultScope, uuid: RenderContext['uuid']): RenderContext {
    const { dispatch } = scope;
    const developerUsername = scope.core.config.notifications?.developerUsername;
    return developerUsername === undefined ? { uuid, dispatch } : { uuid, developerUsername, dispatch };
}

async function handleNotice(notice: Notice, uuid: RenderContext['uuid'], scope: FaultScope): Promise<void> {
    if (notice.report) {
        logger().error(`${notice.name}: ${paint.mute(uuid)}`, notice);
        reportFault(notice, uuid, scope.dispatch, scope.payload, scope.core);
    }
    const { sender } = scope;
    if (!sender) {
        await sendGuarded(scope.routeId, () => respondEmptyChoices(scope));
        return;
    }
    const response = notice.render(renderContext(scope, uuid));
    await sendGuarded(scope.routeId, () => sender.send(response, { ephemeral: notice.ephemeral }));
}

async function handleRawFault(error: Error, uuid: RenderContext['uuid'], scope: FaultScope): Promise<void> {
    const { core, sender } = scope;

    if (core.config.errors?.errorStack ?? false) logger().error(paint.mute(uuid), error);
    else logger().error(`${paint.mute(uuid)} | ${error.message}`);

    reportFault(error, uuid, scope.dispatch, scope.payload, core);

    if (!sender) {
        await sendGuarded(scope.routeId, () => respondEmptyChoices(scope));
        return;
    }

    const Override = core.config.errors?.defaultError;
    const card = Override ? new Override(uuid) : new Fault();
    const response = card.render(renderContext(scope, uuid));
    await sendGuarded(scope.routeId, () => sender.send(response, { ephemeral: true }));
}

async function handleFault(caught: unknown, scope: FaultScope): Promise<void> {
    if (caught instanceof Silence) {
        if (caught.reason !== undefined && (scope.core.config.errors?.logSilences ?? true)) {
            logger().debug(`Silence: ${caught.reason}`);
        }
        return;
    }

    const uuid = crypto.randomUUID();
    if (caught instanceof Notice) {
        await handleNotice(caught, uuid, scope);
        return;
    }

    const error = asError(caught);

    const ignore = new Set<number | string>(scope.core.config.errors?.ignoreApiCodes ?? []);
    if (error instanceof DiscordAPIError && ignore.has(error.code)) {
        logger().debug(`swallowed api code ${paint.amber(String(error.code))}`);
        return;
    }

    await handleRawFault(error, uuid, scope);
}

interface DispatchArgs {
    readonly match: ResolvedRoute;
    readonly payload: ValidInteractionTypes;
    readonly core: Core;
    readonly middlewares: MiddlewareRegistry<InteractionMiddlewareConstructor>;
}

function unhandledRouteId(match: ResolvedRoute): string {
    if (match.routeId) return match.routeId;
    // an empty key means a customId seedcord never minted
    const key = match.attemptedKey ?? '';
    return `${match.kind}:${key.length > 0 ? key : 'unrouted'}`;
}

// a fresh sender can still reply the card because nothing is acked yet here
function freshScope(
    match: ResolvedRoute,
    payload: ValidInteractionTypes,
    core: Core,
    dispatch: DispatchContext
): FaultScope {
    const ref = { application_id: payload.application_id, id: payload.id, token: payload.token };
    const routeId = unhandledRouteId(match);
    return {
        core,
        payload,
        routeId,
        dispatch,
        sender: match.kind === InteractionKind.Autocomplete ? null : new ReplySender(ref, core.rest, dispatch, core.bus)
    };
}

function dispatchReporter(
    match: ResolvedRoute,
    payload: ValidInteractionTypes,
    core: Core,
    dispatchId: string
): (outcome: DispatchOutcome) => void {
    const startedAt = performance.now();
    const queuedMs = queuedMsFor(payload.id);
    return (outcome) => {
        reportDispatch(core.bus, {
            dispatchId,
            routeId: unhandledRouteId(match),
            interactionId: payload.id,
            kind: match.kind,
            outcome,
            fallback: match.routeId === null,
            // discord sends member.user in a guild and user in a dm
            userId: (payload.member?.user ?? payload.user)?.id ?? null,
            guildId: payload.guild_id ?? null,
            startedAt,
            queuedMs
        });
    };
}

async function answer(
    caught: unknown,
    scope: FaultScope,
    report: (outcome: DispatchOutcome) => void,
    outcome: DispatchOutcome = outcomeFor(caught)
): Promise<void> {
    try {
        await handleFault(caught, scope);
    } finally {
        report(outcome);
    }
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
    const routeId = unhandledRouteId(match);
    // every fault path below renders against this one context
    const dispatch = new DispatchContext(routeId);
    const report = dispatchReporter(match, payload, core, dispatch.id);

    const Handler = match.ctor;
    logger().debug(`Processing ${paint.sky.bold(routeId)} with ${paint.mute(Handler.name)}`);

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
        routeId,
        dispatch,
        sender: handler instanceof RepliableHandler ? handler.sender : null
    };

    const ran: InteractionMiddleware[] = [];
    const refusal = await refusalBeforeHandler({ args, Handler, dispatch, scope, ran });
    if (refusal) {
        try {
            // a throwing render() inside answer() must not skip the after() calls
            await answer(refusal.caught, scope, report);
        } finally {
            await runAfter(ran, resultFor(refusal.caught), logger());
        }
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
    const monitor = slowGateMonitor();
    try {
        await runHandlerGates(
            Handler,
            interactionGateContext(payload, core, dispatch),
            match.routeId ?? undefined,
            monitor?.observe
        );
        return null;
    } catch (caught) {
        return { caught };
    } finally {
        // a refusing gate spent budget too
        monitor?.report(match.routeId);
    }
}
