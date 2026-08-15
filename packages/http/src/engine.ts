import { asError, PublishDefault } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger, paint } from '@seedcord/logger';
import { InteractionResponseType, InteractionType } from 'discord-api-types/v10';
import { Converters, Envapter } from 'envapt';

import { dispatchInteraction } from './dispatch/dispatchInteraction';
import { resolve } from './dispatch/resolve';
import { Ed25519Verifier } from './receiver/Ed25519Verifier';
import { ReplayGuard } from './receiver/ReplayGuard';

import type { ValidInteractionTypes } from '#handlers/interactionTypes';
import type { Core } from '#interfaces/Core';
import type { RouteMaps } from './dispatch/resolve';
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

type Outcome = 'not-post' | 'unsigned' | 'stale' | 'bad-signature' | 'bad-body' | 'ping' | 'replay' | 'dispatched';
type Answer = readonly [Response, Outcome];

function hasInteractionType(payload: unknown): payload is { type: number } {
    return typeof payload === 'object' && payload !== null && 'type' in payload && typeof payload.type === 'number';
}

/** Structural match for the Workers `ExecutionContext`. Pass it from the edge entry so post-202 work runs under `waitUntil`. */
export interface EngineContext {
    waitUntil(promise: Promise<unknown>): void;
}

export interface EngineParts {
    readonly handle: (request: Request, ctx?: EngineContext) => Promise<Response>;
    // node paths only, drained at shutdown
    readonly inFlight: ReadonlySet<Promise<void>>;
}

export function buildEngine(core: Core, maps: RouteMaps): EngineParts {
    if (!Envapter.has('DISCORD_PUBLIC_KEY')) throw new SeedcordError(SeedcordErrorCode.ConfigMissingPublicKey);
    const publicKey = Envapter.getRequired('DISCORD_PUBLIC_KEY', Converters.String);

    const verifier = new Ed25519Verifier(publicKey);
    const replays = new ReplayGuard();
    const inFlight = new Set<Promise<void>>();
    // eager because env binds before this factory runs
    const logger = new Logger('Engine', { channel: 'bot' });

    async function dispatchMatched(
        match: NonNullable<ReturnType<typeof resolve>>,
        payload: ValidInteractionTypes,
        ctx: EngineContext | undefined
    ): Promise<void> {
        const start = await dispatchInteraction({ match, payload, core });
        if (!start) return;

        // this catch is all that stands between a throw and an unhandled rejection
        const work = start().catch(rootFault);
        if (ctx) {
            ctx.waitUntil(work);
        } else {
            inFlight.add(work);
            void work.finally(() => inFlight.delete(work));
        }
    }

    function rootFault(caught: unknown): void {
        const error = asError(caught);
        logger.error('dispatch failed past the boundary', error);
        core.bus[PublishDefault]('unhandledInteractionError', { error });
    }

    const handle = async (request: Request, ctx?: EngineContext): Promise<Response> => {
        const [response, outcome] = await respond(request, ctx);
        logger.debug(`${paint.sky.bold(request.method)} ${outcome} ${paint.amber(String(response.status))}`);
        return response;
    };

    const respond = async (request: Request, ctx?: EngineContext): Promise<Answer> => {
        if (request.method !== 'POST') {
            return [new Response(null, { status: METHOD_NOT_ALLOWED, headers: { allow: 'POST' } }), 'not-post'];
        }

        const signature = request.headers.get(SIGNATURE_HEADER);
        const timestamp = request.headers.get(TIMESTAMP_HEADER);
        if (signature === null || timestamp === null) return [new Response(null, { status: UNAUTHORIZED }), 'unsigned'];

        const timestampMs = replays.fresh(timestamp);
        if (timestampMs === null) return [new Response(null, { status: UNAUTHORIZED }), 'stale'];

        const body = new Uint8Array(await request.arrayBuffer());
        if (!(await verifier.verify(signature, timestamp, body))) {
            return [new Response(null, { status: UNAUTHORIZED }), 'bad-signature'];
        }

        let payload: unknown;
        try {
            payload = JSON.parse(decoder.decode(body));
        } catch {
            return [new Response(null, { status: BAD_REQUEST }), 'bad-body'];
        }
        if (!hasInteractionType(payload)) return [new Response(null, { status: BAD_REQUEST }), 'bad-body'];

        // discord resends the same signed ping while verifying an endpoint, and a 401 there reads as a broken endpoint
        if (payload.type === PING) {
            return [Response.json({ type: InteractionResponseType.Pong }), 'ping'];
        }

        if (!replays.unseen(signature, timestampMs)) return [new Response(null, { status: UNAUTHORIZED }), 'replay'];

        try {
            // justified: the payload is signed by Discord, and the type field anchors the discriminated union
            core.bus[PublishDefault]('anyInteraction', { interaction: payload as APIInteraction });
            const match = resolve(maps, payload as APIInteraction);
            if (match) await dispatchMatched(match, payload as ValidInteractionTypes, ctx);
        } catch (caught) {
            // the 202 has to go out either way or discord drops the interaction
            rootFault(caught);
        }

        return [new Response(null, { status: ACCEPTED }), 'dispatched'];
    };

    return { handle, inFlight };
}
