import { DRAIN_WINDOW_MS, InFlight } from '@seedcord/core/node/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { EngineContext } from '#src/engine';
import type { InteractionsService } from '#src/InteractionsService';
import type { Logger } from '@seedcord/logger';

const SERVICE_UNAVAILABLE = 503;

export class NodeEndpoint implements EngineContext {
    private readonly inFlight: InFlight;
    private starting?: Promise<unknown>;

    constructor(
        private readonly service: InteractionsService,
        logger: Logger
    ) {
        this.inFlight = new InFlight(logger, 'Interactions');
    }

    public open(starting: Promise<unknown>): void {
        this.starting = starting;
    }

    public async fetch(request: Request): Promise<Response> {
        if (!this.starting) throw new SeedcordError(SeedcordErrorCode.CoreFetchBeforeStart);
        await this.starting;
        return await this.answer(request);
    }

    // the built-in server calls this directly because it binds in Ready, before start() resolves
    public answer(request: Request): Promise<Response> {
        if (this.inFlight.closed) return Promise.resolve(new Response(null, { status: SERVICE_UNAVAILABLE }));
        const answering = this.service.engine(request, this);
        this.inFlight.track(answering);
        return answering;
    }

    public waitUntil(work: Promise<unknown>): void {
        this.inFlight.track(work);
    }

    public close(): void {
        this.inFlight.close();
    }

    public drain(): Promise<void> {
        return this.inFlight.drain(DRAIN_WINDOW_MS);
    }
}
