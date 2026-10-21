import { DRAIN_WINDOW_MS, InFlight } from '@seedcord/core/node/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { EngineContext } from '#src/engine';
import type { InteractionsService } from '#src/InteractionsService';
import type { CoordinatedStartup } from '@seedcord/core/node';
import type { HealthResponder } from '@seedcord/core/node/internal';
import type { Logger } from '@seedcord/logger';

const SERVICE_UNAVAILABLE = 503;

function unavailable(): Response {
    return new Response(null, { status: SERVICE_UNAVAILABLE });
}

export class NodeEndpoint implements EngineContext {
    private readonly inFlight: InFlight;
    private started?: Promise<void>;

    constructor(
        private readonly service: InteractionsService,
        logger: Logger,
        private readonly health: HealthResponder | undefined,
        private readonly startup: Pick<CoordinatedStartup, 'isReady'>
    ) {
        this.inFlight = new InFlight(logger, 'Interactions');
    }

    public startWith(starting: Promise<unknown>): void {
        this.started = starting.then(
            () => undefined,
            // the caller of start() gets the error
            () => this.close()
        );
    }

    public async fetch(request: Request): Promise<Response> {
        if (!this.started) throw new SeedcordError(SeedcordErrorCode.CoreFetchBeforeStart);
        await this.started;
        return await this.answer(request);
    }

    // the built-in server calls this directly because it binds in Ready, before start() resolves
    public async answer(request: Request): Promise<Response> {
        if (this.inFlight.closed) return unavailable();
        const health = this.health?.answer(request, this.startup.isReady);
        if (health) return health;
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
