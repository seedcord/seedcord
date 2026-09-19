import { interactionMiddleware, MiddlewareRegistry, RegisterDefaults } from '@seedcord/core/internal';
import { validateDiscordToken } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { Envapter } from 'envapt';

import { createCore } from './dispatch/dispatchInteraction';
import { registerSubscribers } from './dispatch/registerSubscribers';
import { RouteRegistry } from './dispatch/RouteRegistry';
import { buildEngine } from './engine';
import { isHandlerClass, isMiddlewareClass, noRoutes, wrongClass } from './manifest/entries';

import type { InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { HttpConfig } from '#interfaces/Config';
import type { Manifest } from '#src/manifest/Manifest';
import type { EngineContext } from './engine';

export type { EngineContext } from './engine';

// the duplicate-route message prints a file path in this slot on node
const MANIFEST_ORIGIN = 'the manifest';

/**
 * Builds the HTTP-interactions engine, a `(request, ctx?) => Promise<Response>` handler.
 *
 * The handler verifies the Ed25519 signature over the raw request bytes, rejects stale or replayed
 * requests, answers a PING with an in-body PONG, and acks every other interaction with an empty 202.
 * The engine dispatches a matched interaction through the manifest before the 202 goes out. Gates run
 * first and the sender posts any refusal over the REST callback. `execute()` continues past the 202 under
 * `ctx.waitUntil` when the caller passes one (the edge entry), and an engine-held in-flight set tracks
 * it otherwise (node paths). It reads only the method, headers, and body. Mount it at any path.
 *
 * Reads `DISCORD_PUBLIC_KEY` and `DISCORD_BOT_TOKEN` from the environment through envapt and throws a
 * `SeedcordError` when either is missing or malformed.
 *
 * Applies `config.logger`. An omitted `logger` resets the level and the sinks to their defaults, the
 * way `installNodeDefaults` does on the node hosts.
 */
export function createSeedcord(
    config: HttpConfig,
    manifest: Manifest
): (request: Request, ctx?: EngineContext) => Promise<Response> {
    Logger.configure(config.logger ?? {});

    const token = validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN'));
    const core = createCore(config, token);
    core.bus[RegisterDefaults]();
    registerSubscribers(core.bus, manifest.subscribers);

    const routes = new RouteRegistry();
    for (const handler of manifest.handlers) {
        if (!isHandlerClass(handler))
            throw wrongClass('handlers', handler, 'InteractionHandler or AutocompleteHandler');
        if (!routes.register(handler, MANIFEST_ORIGIN)) throw noRoutes('handlers', handler.name, 'route decorator');
    }

    const middlewares = new MiddlewareRegistry<InteractionMiddlewareConstructor>(interactionMiddleware);
    for (const middleware of manifest.middleware) {
        if (!isMiddlewareClass(middleware)) throw wrongClass('middleware', middleware, 'InteractionMiddleware');
        if (!middlewares.register(middleware)) {
            throw noRoutes('middleware', middleware.name, '@RegisterInteractionMiddleware');
        }
    }

    return buildEngine(core, routes.maps, middlewares).handle;
}
