import { DiscordAPIError, REST } from '@discordjs/rest';
import { BaseHandler, DispatchContext, Fault, Notice, Silence } from '@seedcord/core';
import { runHandlerGates, slowGateMonitor } from '@seedcord/core/internal';
import { Logger, paint } from '@seedcord/logger';
import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { InteractionResponseType, InteractionType, RESTJSONErrorCodes, Routes } from 'discord-api-types/v10';

import { RepliableHandler } from '@handlers/RepliableHandler';
import { ReplySender } from '@reply/ReplySender';
import { interactionGateContext } from '@src/gates/context';

import type { ResolvedRoute } from './resolve';
import type { ValidInteractionTypes } from '@handlers/interactionTypes';
import type { Core } from '@interfaces/Core';
import type { Config, IRateLimiter, RenderContext } from '@seedcord/types';

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

export function createCore(config: Config, token: string): Core {
    const rateLimiter: IRateLimiter = config.store ?? new MemoryRateLimiter();
    return { config, rateLimiter, rest: new REST().setToken(token) };
}

function isHandlerCtor(value: unknown): value is HandlerCtor {
    return typeof value === 'function' && value.prototype instanceof BaseHandler;
}

function handlerCtorOf(moduleExports: unknown): HandlerCtor | null {
    if (typeof moduleExports !== 'object' || moduleExports === null) return null;
    for (const value of Object.values(moduleExports)) {
        if (isHandlerCtor(value)) return value;
    }
    return null;
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
    if (notice.report) logger().error(`${notice.name}: ${paint.mute(uuid)}`, notice);
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

// nothing is acked in the pre-handler failure paths, so a fresh sender can reply the card
function freshScope(match: ResolvedRoute, payload: ValidInteractionTypes, core: Core): FaultScope {
    const ref = { application_id: payload.application_id, id: payload.id, token: payload.token };
    const routeId = match.routeId ?? 'unhandled';
    return {
        core,
        payload,
        routeId,
        sender: match.kind === 'autocomplete' ? null : new ReplySender(ref, core.rest, routeId)
    };
}

/**
 * Runs the pre-ack phase for a matched interaction. Loads the route module, constructs the handler, and
 * runs its gates, and the sender posts any refusal. Returns the post-ack execute continuation, or null
 * when a gate refuses or nothing can run.
 */
export async function dispatchInteraction(args: DispatchArgs): Promise<(() => Promise<void>) | null> {
    const { match, payload, core } = args;

    let moduleExports: unknown;
    try {
        moduleExports = await match.load();
    } catch (caught) {
        logger().error(`Route ${paint.sky.bold(match.routeId ?? 'unhandled')} failed to load its module.`, caught);
        await handleFault(caught, freshScope(match, payload, core));
        return null;
    }

    const ctor = handlerCtorOf(moduleExports);
    if (!ctor) {
        const routeId = match.routeId ?? 'unhandled';
        logger().error(`Route ${paint.sky.bold(routeId)} loaded a module with no handler class.`);
        await handleFault(
            new Error(`route ${routeId} loaded a module with no handler class`),
            freshScope(match, payload, core)
        );
        return null;
    }

    const dispatch = new DispatchContext(match.routeId);
    let handler: HttpHandler;
    try {
        handler = new ctor(payload, core, dispatch);
    } catch (caught) {
        await handleFault(caught, freshScope(match, payload, core));
        return null;
    }
    const scope: FaultScope = {
        core,
        payload,
        routeId: match.routeId ?? handler.constructor.name,
        sender: handler instanceof RepliableHandler ? handler.getSender() : null
    };

    if (!(await passedGates(ctor, match, payload, core, scope))) return null;

    return async () => {
        try {
            await handler.execute();
        } catch (caught) {
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
