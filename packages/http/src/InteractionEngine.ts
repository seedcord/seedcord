import { PublishDefault } from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { asError } from '@seedcord/utils/internal';
import { InteractionResponseType, InteractionType } from 'discord-api-types/v10';

import { dispatchInteraction } from './dispatch/dispatchInteraction';
import { resolve } from './dispatch/resolve';
import { Ed25519Verifier } from './receiver/Ed25519Verifier';
import { ReplayGuard } from './receiver/ReplayGuard';
import { keepRequestOpenFor } from './requestScope';

import type { InteractionMiddlewareConstructor } from '#handlers/constructors';
import type { Core } from '#interfaces/Core';
import type { RouteMaps } from './dispatch/resolve';
import type { MiddlewareRegistry } from '@seedcord/core/internal';
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

type Outcome = 'unsigned' | 'stale' | 'bad-signature' | 'bad-body' | 'ping' | 'replay' | 'dispatched';
type Answer = readonly [Response, Outcome];

// discord only POSTs to the interactions endpoint
export function rejectNonPost(request: Request): Response | undefined {
    if (request.method === 'POST') return undefined;
    return new Response(null, { status: METHOD_NOT_ALLOWED, headers: { allow: 'POST' } });
}

function hasInteractionType(payload: unknown): payload is { type: number } {
    return typeof payload === 'object' && payload !== null && 'type' in payload && typeof payload.type === 'number';
}

export class InteractionEngine {
    private readonly verifier: Ed25519Verifier;
    private readonly replays = new ReplayGuard();
    private readonly logger = new Logger('Engine', { channel: 'bot' });

    constructor(
        private readonly core: Core,
        private readonly maps: RouteMaps,
        private readonly middlewares: MiddlewareRegistry<InteractionMiddlewareConstructor>,
        publicKey: string
    ) {
        this.verifier = new Ed25519Verifier(publicKey);
    }

    public async handle(request: Request): Promise<Response> {
        const [response, outcome] = await this.respond(request);
        this.logger.trace(`${paint.sky.bold(request.method)} ${outcome} ${paint.amber(String(response.status))}`);
        return response;
    }

    // only POSTs get here. edge Seedcord.fetch and NodeEndpoint reject every other method first
    private async respond(request: Request): Promise<Answer> {
        const signature = request.headers.get(SIGNATURE_HEADER);
        const timestamp = request.headers.get(TIMESTAMP_HEADER);
        if (signature === null || timestamp === null) return [new Response(null, { status: UNAUTHORIZED }), 'unsigned'];

        const timestampMs = this.replays.fresh(timestamp);
        if (timestampMs === null) return [new Response(null, { status: UNAUTHORIZED }), 'stale'];

        const body = new Uint8Array(await request.arrayBuffer());
        if (!(await this.verifier.verify(signature, timestamp, body))) {
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

        if (!this.replays.unseen(signature, timestampMs)) {
            return [new Response(null, { status: UNAUTHORIZED }), 'replay'];
        }

        // justified: the payload is signed by Discord, and the type field anchors the discriminated union
        await this.dispatch(payload as APIInteraction);

        return [new Response(null, { status: ACCEPTED }), 'dispatched'];
    }

    private async dispatch(interaction: APIInteraction): Promise<void> {
        try {
            this.core.bus[PublishDefault]('anyInteraction', { interaction });
            const resolved = resolve(this.maps, interaction);
            if (resolved) {
                const start = await dispatchInteraction({ resolved, core: this.core, middlewares: this.middlewares });
                // without this catch the rejection reaches the process unhandled
                if (start) keepRequestOpenFor(start().catch((caught: unknown) => this.rootFault(caught)));
            }
        } catch (caught) {
            // handle() has to return the 202 either way or discord fails the interaction
            this.rootFault(caught);
        }
    }

    private rootFault(caught: unknown): void {
        const error = asError(caught);
        this.logger.error('dispatch failed past the boundary', error);
        this.core.bus[PublishDefault]('unhandledInteractionError', { error });
    }
}
