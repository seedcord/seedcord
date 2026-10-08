import { DRAIN_WINDOW_MS, drainInFlight } from '@seedcord/core/node/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { EngineContext } from '#src/engine';
import type { InteractionsService } from '#src/InteractionsService';
import type { Logger } from '@seedcord/logger';

const SERVICE_UNAVAILABLE = 503;

export class InteractionsEndpoint implements EngineContext {
    private readonly inFlight = new Set<Promise<unknown>>();
    private starting?: Promise<unknown>;
    private closed = false;

    constructor(private readonly service: InteractionsService) {}

    public open(starting: Promise<unknown>): void {
        this.starting = starting;
    }

    public async fetch(request: Request): Promise<Response> {
        if (!this.starting) throw new SeedcordError(SeedcordErrorCode.CoreFetchBeforeStart);
        await this.starting;
        return await this.answer(request);
    }

    // the built-in server binds in the Ready phase, before start() resolves
    public answer(request: Request): Promise<Response> {
        if (this.closed) return Promise.resolve(new Response(null, { status: SERVICE_UNAVAILABLE }));
        return this.service.engine(request, this);
    }

    public waitUntil(work: Promise<unknown>): void {
        this.inFlight.add(work);
        void work.finally(() => this.inFlight.delete(work));
    }

    public close(): void {
        this.closed = true;
    }

    public drain(logger: Logger): Promise<void> {
        return drainInFlight(this.inFlight, DRAIN_WINDOW_MS, logger, 'Interactions');
    }
}
