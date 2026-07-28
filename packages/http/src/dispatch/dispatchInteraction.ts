import { DiscordAPIError, REST } from '@discordjs/rest';
import { BaseHandler, Bus, DispatchContext, Fault, Notice, Silence } from '@seedcord/core';
import { dispatchedPayload, PublishDefault, runHandlerGates, slowGateMonitor } from '@seedcord/core/internal';
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

// lazy because the logger reads the environment, which binds after this module loads
let dispatchLogger: Logger | undefined;
function logger(): Logger {
    dispatchLogger ??= new Logger('Dispatcher');
    return dispatchLogger;
}

interface HttpHandler {
    execute(): Promise<void>;
}

type HandlerCtor = new (event: ValidInteractionTypes, core: Core, dispatch?: DispatchContext) => HttpHandler;

// a writable view of Core, so the bus assignment below needs no second cast
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

// these codes from the boundary's own send mean the interaction is gone
const HARMLESS_API_CODES: ReadonlySet<number | string> = new Set([
    RESTJSONErrorCodes.UnknownInteraction,
    RESTJSONErrorCodes.InteractionHasAlreadyBeenAcknowledged,
    RESTJSONErrorCodes.UnknownMessage
]);

// never rethrows
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

// a Notice is illegal on autocomplete, so empty choices clear the pending state
async function respondEmptyChoices(scope: FaultScope): Promise<void> {
    await scope.core.rest.post(Routes.interactionCallback(scope.payload.id, scope.payload.token), {
        body: { type: InteractionResponseType.ApplicationCommandAutocompleteResult, data: { choices: [] } }
    });
}

function renderContext(core: Core, uuid: RenderContext['uuid']): RenderContext {
    const developerUsername = core.config.notifications?.developerUsername;
    return developerUsername === undefined ? { uuid } : { uuid, developerUsername };
}

async function handleNotice(notice: Notice, uuid: RenderContext['uuid'], scope: FaultScope): Promise<void> {
    if (notice.report) {
        logger().error(`${notice.name}: ${paint.mute(uuid)}`, notice);
        reportFault(notice, uuid, scope.payload, scope.core);
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

    reportFault(error, uuid, scope.payload, core);

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
        if (caught.reason !== undefined) logger().debug(`Silence: ${caught.reason}`);
        return;
    }

    const uuid = crypto.randomUUID();
    if (caught instanceof Notice) {
        await handleNotice(caught, uuid, scope);
        return;
    }

    const error = Error.isError(caught) ? caught : new Error(String(caught));

    // empty by default, so every api code from the handler's own work reports
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

// one id for an unmatched dispatch, so a boundary log, its sender, and its telemetry event correlate
function routeIdOf(match: ResolvedRoute): string {
    return match.routeId ?? `${match.kind}:unhandled`;
}

// nothing is acked in the pre-handler failure paths, so a fresh sender can reply the card
function freshScope(match: ResolvedRoute, payload: ValidInteractionTypes, core: Core): FaultScope {
    const ref = { application_id: payload.application_id, id: payload.id, token: payload.token };
    const routeId = routeIdOf(match);
    return {
        core,
        payload,
        routeId,
        sender: match.kind === 'autocomplete' ? null : new ReplySender(ref, core.rest, routeId, core.bus)
    };
}

// the clock starts when the reporter is built, which is the first statement of the dispatch
function dispatchReporter(
    match: ResolvedRoute,
    payload: ValidInteractionTypes,
    core: Core
): (outcome: DispatchOutcome) => void {
    const startedAt = performance.now();
    return (outcome) => {
        core.bus[PublishDefault](
            'interactionDispatched',
            dispatchedPayload({
                routeId: routeIdOf(match),
                kind: match.kind,
                outcome,
                fallback: match.routeId === null,
                startedAt,
                interactionId: payload.id
            })
        );
    };
}

// answers the interaction itself on either failure, so a null return means nothing can run
async function loadHandlerCtor(
    match: ResolvedRoute,
    payload: ValidInteractionTypes,
    core: Core,
    report: (outcome: DispatchOutcome) => void
): Promise<HandlerCtor | null> {
    const routeId = routeIdOf(match);
    let exported: unknown;
    try {
        exported = await match.load();
    } catch (caught) {
        logger().error(`Route ${paint.sky.bold(routeId)} failed to load its handler.`, caught);
        report('failed');
        await handleFault(caught, freshScope(match, payload, core));
        return null;
    }

    if (isHandlerCtor(exported)) return exported;

    logger().error(`Route ${paint.sky.bold(routeId)} loaded an export that is not a handler class.`);
    report('failed');
    await handleFault(
        new Error(`route ${routeId} loaded an export that is not a handler class`),
        freshScope(match, payload, core)
    );
    return null;
}

/**
 * Runs the pre-ack phase for a matched interaction. Loads the route's handler class, constructs it, and
 * runs its gates, and the sender posts any refusal. Returns the post-ack execute continuation, or null
 * when a gate refuses or nothing can run.
 */
export async function dispatchInteraction(args: DispatchArgs): Promise<(() => Promise<void>) | null> {
    const { match, payload, core } = args;
    const report = dispatchReporter(match, payload, core);

    const ctor = await loadHandlerCtor(match, payload, core, report);
    if (!ctor) return null;

    const dispatch = new DispatchContext(match.routeId);
    let handler: HttpHandler;
    try {
        handler = new ctor(payload, core, dispatch);
    } catch (caught) {
        report('failed');
        await handleFault(caught, freshScope(match, payload, core));
        return null;
    }
    const scope: FaultScope = {
        core,
        payload,
        routeId: routeIdOf(match),
        sender: handler instanceof RepliableHandler ? handler.getSender() : null
    };

    if (!(await passedGates(ctor, match, payload, core, scope))) {
        report('refused');
        return null;
    }

    return async () => {
        try {
            await handler.execute();
            report('handled');
        } catch (caught) {
            report('failed');
            await handleFault(caught, scope);
        }
    };
}

// autocomplete has no reply target, @Gated rejects it at compile time, this is the runtime backstop
async function passedGates(
    ctor: HandlerCtor,
    match: ResolvedRoute,
    payload: ValidInteractionTypes,
    core: Core,
    scope: FaultScope
): Promise<boolean> {
    // the router derives match.kind from payload.type, so the two would be the same. the payload.type clause narrows
    // the union to Repliables for interactionGateContext below
    if (match.kind === 'autocomplete' || payload.type === InteractionType.ApplicationCommandAutocomplete) return true;
    const monitor = slowGateMonitor();
    try {
        await runHandlerGates(
            ctor,
            interactionGateContext(payload, core, match.routeId),
            match.routeId ?? undefined,
            monitor?.observe
        );
        return true;
    } catch (caught) {
        await handleFault(caught, scope);
        return false;
    } finally {
        // a refusing gate ate budget too, report either way
        monitor?.report(match.routeId);
    }
}
