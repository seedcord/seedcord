import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';
import { Envapter } from 'envapt';

import { Ed25519Verifier } from './receiver/Ed25519Verifier';
import { ReplayGuard } from './receiver/ReplayGuard';

const SIGNATURE_HEADER = 'x-signature-ed25519';
const TIMESTAMP_HEADER = 'x-signature-timestamp';

// discord-api-types' runtime enums are CJS only, which bundlers cannot tree-shake
const INTERACTION_TYPE_PING = 1;
const INTERACTION_RESPONSE_TYPE_PONG = 1;

const ACCEPTED = 202;
const BAD_REQUEST = 400;
const UNAUTHORIZED = 401;
const METHOD_NOT_ALLOWED = 405;

const decoder = new TextDecoder();

function hasInteractionType(payload: unknown): payload is { type: number } {
    return typeof payload === 'object' && payload !== null && typeof (payload as { type?: unknown }).type === 'number';
}

/**
 * Builds the HTTP-interactions engine, a `(request) => Promise<Response>` handler.
 *
 * The handler verifies the Ed25519 signature over the raw request bytes, rejects stale or replayed
 * requests, answers a PING with an in-body PONG, and acks every other interaction with an empty 202.
 * It reads only the method, headers, and body. Mount it at any path.
 *
 * Reads `DISCORD_PUBLIC_KEY` from the environment through envapt and throws a `SeedcordError` when it
 * is missing or malformed.
 */
export function createSeedcord(): (request: Request) => Promise<Response> {
    const publicKey = Envapter.get('DISCORD_PUBLIC_KEY');
    if (publicKey === undefined) throw new SeedcordError(SeedcordErrorCode.ConfigMissingPublicKey);

    const verifier = new Ed25519Verifier(publicKey);
    const replays = new ReplayGuard();
    const logger = new Logger('Receiver');

    return async (request) => {
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

        if (payload.type === INTERACTION_TYPE_PING) {
            return Response.json({ type: INTERACTION_RESPONSE_TYPE_PONG });
        }

        logger.warn('Interaction received. Dispatch is not implemented yet, replying 202 without handling it.');
        return new Response(null, { status: ACCEPTED });
    };
}
