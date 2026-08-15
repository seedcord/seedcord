import { DiscordAPIError, REST } from '@discordjs/rest';
import { BaseHandler, Bus, DispatchContext, Fault, Notice, Silence } from '@seedcord/core';
import {
    asError,
    outcomeFor,
    queuedMsFor,
    reportDispatch,
    reportedWrite,
    runHandlerGates,
    slowGateMonitor
} from '@seedcord/core/internal';
import { Logger, paint } from '@seedcord/logger';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { InteractionResponseType, InteractionType, RESTJSONErrorCodes, Routes } from 'discord-api-types/v10';

import { RepliableHandler } from '@handlers/RepliableHandler';
import { ReplySender } from '@reply/ReplySender';
import { interactionGateContext } from '@src/gates/context';

import { reportFault } from './reportFault';

import type { ResolvedRoute } from './resolve';
import type { ValidInteractionTypes } from '@handlers/interactionTypes';
import type { HttpConfig } from '@interfaces/Config';
import type { Core } from '@interfaces/Core';
import type { DispatchOutcome } from '@seedcord/core';
import type { IRateLimiter, RenderContext, TypedOmit } from '@seedcord/types';

// lazy, env binds after this module loads
let dispatchLogger: Logger | undefined;
function logger(): Logger {
    dispatchLogger ??= new Logger('Dispatcher', { channel: 'interactions' });
    return dispatchLogger;
}

interface HttpHandler {
    execute(): Promise<void>;
}

type HandlerCtor = new (event: ValidInteractionTypes, core: Core, dispatch?: DispatchContext) => HttpHandler;

type CoreDraft = TypedOmit<Core, 'bus'> & { bus: Bus };

export function createCore(config: HttpConfig, token: string): Core {
    const rateLimiter: IRateLimiter = config.store ?? new MemoryRateLimiter();
    // justified: bus completes the shape on the next line, and the Bus reads core at dispatch
    const draft = { config, rateLimiter, rest: new REST().setToken(token) } as CoreDraft;
    draft.bus = new Bus(draft);
    return draft;
}

function isHandlerCtor(value: unknown): value is HandlerCtor {
    return typeof value === 'function' && value.prototype instanceof BaseHandler;
}

interface FaultScope {
    readonly core: Core;
    readonly payload: ValidInteractionTypes;
    readonly routeId: string;
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

// a message reply is illegal on autocomplete, so empty choices are the only way to clear the pending state
async function respondEmptyChoices(scope: FaultScope): Promise<void> {
    const telemetry = { bus: scope.core.bus, interactionId: scope.payload.id };
    await reportedWrite(telemetry, scope.routeId, 'respond', () =>
        scope.core.rest.post(Routes.interactionCallback(scope.payload.id, scope.payload.token), {
            body: { type: InteractionResponseType.ApplicationCommandAutocompleteResult, data: { choices: [] } }
        })
    );
}

function renderContext(core: Core, uuid: RenderContext['uuid']): RenderContext {
    const developerUsername = core.config.notifications?.developerUsername;
    return developerUsername === undefined ? { uuid } : { uuid, developerUsername };
}

async function handleNotice(notice: Notice, uuid: RenderContext['uuid'], scope: FaultScope): Promise<void> {
    if (notice.report) {
        logger().error(`${notice.name}: ${paint.mute(uuid)}`, notice);
        reportFault(notice, uuid, scope.routeId, scope.payload, scope.core);
    }
    const { sender } = scope;
    if (!sender) {
        await sendGuarded(scope.routeId, () => respondEmptyChoices(scope));
        return;
    }
    const response = notice.render(renderContext(scope.core, uuid));
    await sendGuarded(scope.routeId, () => sender.send(response, { ephemeral: notice.ephemeral }));
}

async function handleRawFault(error: Error, uuid: RenderContext['uuid'], scope: FaultScope): Promise<void> {
    const { core, sender } = scope;

    if (core.config.errors?.errorStack ?? false) logger().error(paint.mute(uuid), error);
    else logger().error(`${paint.mute(uuid)} | ${error.message}`);

    reportFault(error, uuid, scope.routeId, scope.payload, core);

    if (!sender) {
        await sendGuarded(scope.routeId, () => respondEmptyChoices(scope));
        return;
    }

    const override = core.config.errors?.defaultError;
    const card = override ? new override(uuid) : new Fault();
    const response = card.render(renderContext(core, uuid));
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
}

function unhandledRouteId(match: ResolvedRoute): string {
    if (match.routeId) return match.routeId;
    // an empty key means a customId seedcord never minted, since a minted routeKey always outlives its 3-char hash
    const key = match.attemptedKey ?? '';
    return `${match.kind}:${key.length > 0 ? key : 'unrouted'}`;
}

// nothing is acked yet here, so a fresh sender can reply the card
function freshScope(match: ResolvedRoute, payload: ValidInteractionTypes, core: Core): FaultScope {
    const ref = { application_id: payload.application_id, id: payload.id, token: payload.token };
    const routeId = unhandledRouteId(match);
    return {
        core,
        payload,
        routeId,
        sender: match.kind === 'autocomplete' ? null : new ReplySender(ref, core.rest, routeId, core.bus)
    };
}

function dispatchReporter(
    match: ResolvedRoute,
    payload: ValidInteractionTypes,
    core: Core
): (outcome: DispatchOutcome) => void {
    const startedAt = performance.now();
    // reading this at publish time would count the handler run into the queue too
    const queuedMs = queuedMsFor(payload.id);
    return (outcome) => {
        reportDispatch(core.bus, {
            routeId: unhandledRouteId(match),
            interactionId: payload.id,
            kind: match.kind,
            outcome,
            fallback: match.routeId === null,
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

async function loadHandlerCtor(
    match: ResolvedRoute,
    payload: ValidInteractionTypes,
    core: Core,
    report: (outcome: DispatchOutcome) => void
): Promise<HandlerCtor | null> {
    const routeId = unhandledRouteId(match);
    let exported: unknown;
    try {
        exported = await match.load();
    } catch (caught) {
        logger().error(`Route ${paint.sky.bold(routeId)} failed to load its handler.`, caught);
        await answer(caught, freshScope(match, payload, core), report, 'failed');
        return null;
    }

    if (isHandlerCtor(exported)) return exported;

    logger().error(`Route ${paint.sky.bold(routeId)} loaded an export that is not a handler class.`);
    const wrong = new Error(`route ${routeId} loaded an export that is not a handler class`);
    await answer(wrong, freshScope(match, payload, core), report, 'failed');
    return null;
}

// a null return means the refusal is already sent
export async function dispatchInteraction(args: DispatchArgs): Promise<(() => Promise<void>) | null> {
    const { match, payload, core } = args;
    const report = dispatchReporter(match, payload, core);

    const ctor = await loadHandlerCtor(match, payload, core, report);
    if (!ctor) return null;

    const routeId = unhandledRouteId(match);
    logger().debug(`Processing ${paint.sky.bold(routeId)} with ${paint.mute(ctor.name)}`);

    const dispatch = new DispatchContext(routeId);
    let handler: HttpHandler;
    try {
        handler = new ctor(payload, core, dispatch);
    } catch (caught) {
        await answer(caught, freshScope(match, payload, core), report);
        return null;
    }
    const scope: FaultScope = {
        core,
        payload,
        routeId,
        sender: handler instanceof RepliableHandler ? handler.getSender() : null
    };

    const refusal = await gateRefusal(ctor, match, payload, core);
    if (refusal) {
        await answer(refusal.caught, scope, report);
        return null;
    }

    return async () => {
        try {
            await handler.execute();
            report('handled');
        } catch (caught) {
            await answer(caught, scope, report);
        }
    };
}

// autocomplete has no reply target. @Gated rejects it at compile time and this is the runtime backstop
async function gateRefusal(
    ctor: HandlerCtor,
    match: ResolvedRoute,
    payload: ValidInteractionTypes,
    core: Core
): Promise<{ caught: unknown } | null> {
    // match.kind comes from payload.type in the router. the second clause narrows the union to
    // Repliables for interactionGateContext
    if (match.kind === 'autocomplete' || payload.type === InteractionType.ApplicationCommandAutocomplete) return null;
    const monitor = slowGateMonitor();
    try {
        await runHandlerGates(
            ctor,
            interactionGateContext(payload, core, match.routeId),
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
