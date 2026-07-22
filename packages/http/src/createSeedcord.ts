import { validateDiscordToken } from '@seedcord/errors/internal';
import { Envapter } from 'envapt';

import { createCore } from './dispatch/dispatchInteraction';
import { buildRouteMaps } from './dispatch/resolve';
import { buildEngine } from './engine';

import type { EngineContext } from './engine';
import type { Config } from '@seedcord/types';
import type { RouteManifest } from '@src/manifest/RouteManifest';

export type { EngineContext } from './engine';

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
 */
export function createSeedcord(
    config: Config,
    manifest: RouteManifest
): (request: Request, ctx?: EngineContext) => Promise<Response> {
    const token = validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN'));
    const core = createCore(config, token);
    return buildEngine(core, buildRouteMaps(manifest)).handle;
}
