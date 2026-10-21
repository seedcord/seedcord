import { paint } from '@seedcord/errors';

import { formatUptime } from '#ui/format';

import type { CloudflaredTunnel } from './CloudflaredTunnel';
import type { InteractionsEndpoint } from './InteractionsEndpoint';
import type { ILogger } from '@seedcord/types';
import type { SeedcordInstance } from '@seedcord/types/internal';

const PASTE_HINT = 'The tunnel is still up, so try pasting that URL into the dashboard.';
const RESTART_HINT = 'Restart for a fresh hostname, or set `tunnel` to an https URL you already serve.';

export type CoordinatorTunnel = Pick<CloudflaredTunnel, 'open' | 'stop'>;

export type TunnelPhase = 'opening' | 'resolving' | 'registering';
export type TunnelStatus = TunnelPhase | 'live' | 'lost';

export interface CoordinatorDeps {
    readonly makeTunnel: (onLost: () => void) => CoordinatorTunnel;
    // a quick hostname lasts only as long as this process, so quit clears the endpoint
    readonly kind: 'quick' | 'configured';
    readonly endpoint: Pick<InteractionsEndpoint, 'set' | 'clear' | 'reuse'>;
    readonly onStatus: (status: TunnelStatus | null) => void;
    readonly logger: ILogger;
}

// a call, because a direct read of signal.aborted narrows to false past the first check
function superseded(attempt: AbortController): boolean {
    return attempt.signal.aborted;
}

function opening(kind: CoordinatorDeps['kind']): string {
    return kind === 'quick' ? 'Requesting a cloudflared tunnel to port' : 'Checking if your tunnel reaches port';
}

interface LiveTunnel {
    readonly port: number;
    readonly url: string;
    readonly attempt: AbortController;
}

function elapsedSince(startedAt: number): () => string {
    return () => paint.mute(`+${formatUptime(Date.now() - startedAt)}`);
}

export class TunnelCoordinator {
    private live: LiveTunnel | undefined;
    private current: AbortController | undefined;

    constructor(private readonly deps: CoordinatorDeps) {}

    public async onPort(port: number, instance: SeedcordInstance): Promise<void> {
        if (this.live?.port === port) return this.registerAgain(this.live, instance);

        this.live = undefined;
        const attempt = this.begin();
        const since = elapsedSince(Date.now());
        const tunnel = this.deps.makeTunnel(() => this.reportLost(attempt));
        // a later onPort has no handle on this tunnel. the abort is the only way back to stop it.
        attempt.signal.addEventListener('abort', () => tunnel.stop(), { once: true });
        let patched = false;

        try {
            this.deps.onStatus('opening');
            this.deps.logger.info(`${opening(this.deps.kind)} ${paint.sky.bold(String(port))}`);
            const url = await tunnel.open(attempt.signal, port, () => this.deps.onStatus('resolving'));
            if (superseded(attempt)) return;
            this.deps.logger.info(`Reachable at ${paint.sky.bold(url)} ${since()}`);

            patched = true;
            await this.register({ port, url, attempt }, since, instance);
        } catch (error: unknown) {
            if (superseded(attempt)) return;
            // discord will refuse the same hostname again
            if (patched) attempt.abort();
            this.reportFailure(error, patched);
        }
    }

    private async registerAgain(live: LiveTunnel, instance: SeedcordInstance): Promise<void> {
        if (this.deps.endpoint.reuse(live.url, instance)) return;

        try {
            await this.register(live, elapsedSince(Date.now()), instance);
        } catch (error: unknown) {
            if (superseded(live.attempt)) return;
            this.reportFailure(error, false);
        }
    }

    private async register(live: LiveTunnel, since: () => string, instance: SeedcordInstance): Promise<void> {
        this.deps.onStatus('registering');
        await this.deps.endpoint.set(live.url, live.attempt.signal, instance);
        if (superseded(live.attempt)) return;

        this.live = live;
        this.deps.onStatus('live');
        this.deps.logger.info(`Interactions endpoint set on the dev dashboard ${since()}`);
    }

    private reportLost(attempt: AbortController): void {
        if (superseded(attempt)) return;

        this.live = undefined;
        this.deps.onStatus('lost');
        this.deps.logger.error('cloudflared exited, so the bot has no public endpoint');
    }

    private reportFailure(error: unknown, patched: boolean): void {
        this.deps.onStatus(null);
        this.deps.logger.error('Tunnel setup failed, the bot runs without a public endpoint', error);
        // patched means the abort above stopped the tunnel. the paste hint only holds while it is up.
        if (this.deps.kind === 'quick') this.deps.logger.info(patched ? RESTART_HINT : PASTE_HINT);
    }

    public async stop(): Promise<void> {
        if (!this.current) return;

        this.live = undefined;
        this.current.abort();
        this.current = undefined;
        this.deps.onStatus(null);
        if (this.deps.kind === 'configured') return;

        try {
            await this.deps.endpoint.clear();
        } catch (error: unknown) {
            this.deps.logger.warn('Could not clear the interactions endpoint', error);
        }
    }

    private begin(): AbortController {
        this.current?.abort();
        this.current = new AbortController();
        return this.current;
    }
}
