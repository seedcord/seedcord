import { paint } from '@seedcord/logger';

import type { CloudflaredTunnel } from './CloudflaredTunnel';
import type { InteractionsEndpoint } from './InteractionsEndpoint';
import type { ILogger } from '@seedcord/types';

export type CoordinatorTunnel = Pick<CloudflaredTunnel, 'open' | 'stop'>;

export interface CoordinatorDeps {
    readonly makeTunnel: () => CoordinatorTunnel;
    readonly endpoint: Pick<InteractionsEndpoint, 'set' | 'clear'>;
    readonly waitForRouting: (url: string) => Promise<void>;
    readonly onUrl: (url: string | null) => void;
    readonly logger: ILogger;
}

export class TunnelCoordinator {
    private target: number | undefined;
    private live: CoordinatorTunnel | undefined;
    private attempt = 0;

    constructor(private readonly deps: CoordinatorDeps) {}

    public async onPort(port: number): Promise<void> {
        if (this.target === port) return;

        const started = ++this.attempt;
        this.target = port;
        this.live?.stop();
        this.live = undefined;

        // one child per attempt, so a late attempt can stop its own without reaching the live tunnel
        const tunnel = this.deps.makeTunnel();
        try {
            const url = await tunnel.open(port);
            if (this.superseded(started, tunnel)) return;
            this.live = tunnel;

            await this.deps.waitForRouting(url);
            if (this.superseded(started, tunnel)) return;

            await this.deps.endpoint.set(url);
            if (this.superseded(started, tunnel)) return;

            this.deps.onUrl(url);
            this.deps.logger.info(`Interactions endpoint set to ${paint.sky(url)}`);
        } catch (error: unknown) {
            tunnel.stop();
            if (started !== this.attempt) return;

            // cleared so the next restart on this port retries
            this.target = undefined;
            this.live = undefined;
            this.deps.onUrl(null);
            this.deps.logger.error('Tunnel setup failed, the bot runs without a public endpoint', error);
        }
    }

    public async stop(): Promise<void> {
        if (this.target === undefined) return;

        this.attempt++;
        this.target = undefined;
        this.live?.stop();
        this.live = undefined;
        this.deps.onUrl(null);

        try {
            await this.deps.endpoint.clear();
        } catch (error: unknown) {
            // every caller of quit() drops the promise, so a rejection here would go unhandled
            this.deps.logger.warn('Could not clear the interactions endpoint', error);
        }
    }

    private superseded(started: number, tunnel: CoordinatorTunnel): boolean {
        if (started === this.attempt) return false;
        tunnel.stop();
        return true;
    }
}
