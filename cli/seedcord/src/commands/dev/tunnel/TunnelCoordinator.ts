import { paint } from '@seedcord/logger';

import type { CloudflaredTunnel } from './CloudflaredTunnel';
import type { InteractionsEndpoint } from './InteractionsEndpoint';
import type { ILogger } from '@seedcord/types';

export interface CoordinatorDeps {
    readonly tunnel: Pick<CloudflaredTunnel, 'open' | 'stop'>;
    readonly endpoint: Pick<InteractionsEndpoint, 'set' | 'clear'>;
    readonly waitForRouting: (url: string) => Promise<void>;
    readonly onUrl: (url: string | null) => void;
    readonly logger: ILogger;
}

export class TunnelCoordinator {
    private target: number | undefined;

    constructor(private readonly deps: CoordinatorDeps) {}

    public async onPort(port: number): Promise<void> {
        if (this.target === port) return;
        if (this.target !== undefined) this.deps.tunnel.stop();

        this.target = port;
        try {
            const url = await this.deps.tunnel.open(port);
            await this.deps.waitForRouting(url);
            await this.deps.endpoint.set(url);
            this.deps.onUrl(url);
            this.deps.logger.info(`Interactions endpoint set to ${paint.sky(url)}`);
        } catch (error: unknown) {
            // cleared so the next restart on this port retries
            this.target = undefined;
            this.deps.tunnel.stop();
            this.deps.onUrl(null);
            this.deps.logger.warn('Tunnel setup failed, the bot runs without a public endpoint', error);
        }
    }

    public async stop(): Promise<void> {
        if (this.target === undefined) return;

        this.target = undefined;
        this.deps.tunnel.stop();
        this.deps.onUrl(null);

        try {
            await this.deps.endpoint.clear();
        } catch (error: unknown) {
            // every caller of quit() drops the promise, so a rejection here would go unhandled
            this.deps.logger.warn('Could not clear the interactions endpoint', error);
        }
    }
}
