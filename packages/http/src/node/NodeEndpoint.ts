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

    constructor(
        private readonly service: InteractionsService,
        logger: Logger,
        private readonly health: HealthResponder | undefined,
        private readonly startup: Pick<CoordinatedStartup, 'isReady' | 'hasBegun'>
    ) {
        this.inFlight = new InFlight(logger, 'Interactions');
    }

    public async fetch(request: Request): Promise<Response> {
        if (!this.startup.hasBegun) throw new SeedcordError(SeedcordErrorCode.CoreFetchBeforeStart);
        return (await this.inFlight.admit(() => this.respond(request))) ?? unavailable();
    }

    private respond(request: Request): Promise<Response> {
        const health = this.health?.answer(request, this.startup.isReady);
        return health ? Promise.resolve(health) : this.service.engine(request, this);
    }

    public waitUntil(work: Promise<unknown>): void {
        this.inFlight.track(work);
    }

    public open(): void {
        this.inFlight.open();
    }

    public close(): void {
        this.inFlight.close();
    }

    public drain(): Promise<void> {
        return this.inFlight.drain(DRAIN_WINDOW_MS);
    }
}
