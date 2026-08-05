import { paint } from '@seedcord/logger';

import type { CloudflaredTunnel } from './CloudflaredTunnel';
import type { InteractionsEndpoint } from './InteractionsEndpoint';
import type { ILogger } from '@seedcord/types';

export type CoordinatorTunnel = Pick<CloudflaredTunnel, 'open' | 'stop'>;

export interface CoordinatorDeps {
    readonly makeTunnel: () => CoordinatorTunnel;
    readonly endpoint: Pick<InteractionsEndpoint, 'set' | 'clear'>;
    readonly onUrl: (url: string | null) => void;
    readonly logger: ILogger;
}

// inlined because this narrows to false past the first check
function superseded(attempt: AbortController): boolean {
    return attempt.signal.aborted;
}

export class TunnelCoordinator {
    private target: number | undefined;
    private current: AbortController | undefined;

    constructor(private readonly deps: CoordinatorDeps) {}

    public async onPort(port: number): Promise<void> {
        if (this.target === port) return;

        this.target = port;
        const attempt = this.begin();
        const tunnel = this.deps.makeTunnel();
        // a later onPort holds no handle on this tunnel, so abort contains the stop
        attempt.signal.addEventListener('abort', () => tunnel.stop(), { once: true });

        try {
            const url = await tunnel.open(port, attempt.signal);
            if (superseded(attempt)) return;

            await this.deps.endpoint.set(url, attempt.signal);
            if (superseded(attempt)) return;

            this.deps.onUrl(url);
            this.deps.logger.info(`Interactions endpoint set to ${paint.sky.italic(url)}`);
        } catch (error: unknown) {
            if (superseded(attempt)) return;
            attempt.abort();

            // cleared so the next restart on this port retries
            this.target = undefined;
            this.deps.onUrl(null);
            this.deps.logger.error('Tunnel setup failed, the bot runs without a public endpoint', error);
        }
    }

    public async stop(): Promise<void> {
        if (this.target === undefined) return;

        this.target = undefined;
        this.current?.abort();
        this.current = undefined;
        this.deps.onUrl(null);

        try {
            await this.deps.endpoint.clear();
        } catch (error: unknown) {
            // every caller of quit() drops the promise, so a rejection here would go unhandled
            this.deps.logger.warn('Could not clear the interactions endpoint', error);
        }
    }

    private begin(): AbortController {
        this.current?.abort();
        this.current = new AbortController();
        return this.current;
    }
}
