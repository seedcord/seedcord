import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, validateDiscordToken } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { InteractionResponseType, InteractionType } from 'discord-api-types/v10';
import { Envapter } from 'envapt';

import { createCore, dispatchInteraction } from './dispatch/dispatchInteraction';
import { buildRouteMaps, resolve } from './dispatch/resolve';
import { Ed25519Verifier } from './receiver/Ed25519Verifier';
import { ReplayGuard } from './receiver/ReplayGuard';

import type { ValidInteractionTypes } from '@handlers/BaseHandler';
import type { Config } from '@seedcord/types';
import type { RouteManifest } from '@src/manifest/RouteManifest';
import type { APIInteraction } from 'discord-api-types/v10';

const SIGNATURE_HEADER = 'x-signature-ed25519';
const TIMESTAMP_HEADER = 'x-signature-timestamp';

const ACCEPTED = 202;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const METHOD_NOT_ALLOWED = 405;

// widened so the raw payload's number field compares without an unsafe enum comparison
const PING: number = InteractionType.Ping;

const decoder = new TextDecoder();

function hasInteractionType(payload: unknown): payload is { type: number } {
    return typeof payload === 'object' && payload !== null && 'type' in payload && typeof payload.type === 'number';
}

/** Structural match for the Workers `ExecutionContext`. Pass it from the edge entry so post-202 work runs under `waitUntil`. */
export interface EngineContext {
    waitUntil(promise: Promise<unknown>): void;
}

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
    const publicKey = Envapter.get('DISCORD_PUBLIC_KEY');
    if (publicKey === undefined) throw new SeedcordError(SeedcordErrorCode.ConfigMissingPublicKey);
    const token = validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN'));

    const verifier = new Ed25519Verifier(publicKey);
    const replays = new ReplayGuard();
    const maps = buildRouteMaps(manifest);
    const inFlight = new Set<Promise<void>>();
    const core = createCore(config, token);
    // constructed here because the logger reads the environment, which binds before this factory runs
    const logger = new Logger('Engine');

    async function dispatchMatched(
        match: NonNullable<ReturnType<typeof resolve>>,
        payload: ValidInteractionTypes,
        ctx: EngineContext | undefined
    ): Promise<void> {
        const start = await dispatchInteraction({ match, payload, core });
        if (!start) return;

        const work = start();
        if (ctx) {
            ctx.waitUntil(work);
        } else {
            inFlight.add(work);
            void work.finally(() => inFlight.delete(work));
        }
    }

    return async (request, ctx) => {
        if (request.method !== 'POST') {
            return new Response(null, { status: METHOD_NOT_ALLOWED, headers: { allow: 'POST' } });
        }

        const signature = request.headers.get(SIGNATURE_HEADER);
        const timestamp = request.headers.get(TIMESTAMP_HEADER);
        if (signature === null || timestamp === null) return new Response(null, { status: UNAUTHORIZED });

        const body = new Uint8Array(await request.arrayBuffer());
        if (!(await verifier.verify(signature, timestamp, body))) {
            return new Response(null, { status: UNAUTHORIZED });
        }
        if (!replays.accepts(signature, timestamp)) return new Response(null, { status: UNAUTHORIZED });

        let payload: unknown;
        try {
            payload = JSON.parse(decoder.decode(body));
        } catch {
            return new Response(null, { status: BAD_REQUEST });
        }
        if (!hasInteractionType(payload)) return new Response(null, { status: BAD_REQUEST });

        if (payload.type === PING) {
            return Response.json({ type: InteractionResponseType.Pong });
        }

        try {
            // justified: the payload is signed by Discord, the type field anchors the discriminated union
            const match = resolve(maps, payload as APIInteraction);
            if (match) await dispatchMatched(match, payload as ValidInteractionTypes, ctx);
        } catch (caught) {
            // a throw here must never eat the ack
            logger.error('dispatch failed, acking anyway', caught);
        }

        return new Response(null, { status: ACCEPTED });
    };
}
