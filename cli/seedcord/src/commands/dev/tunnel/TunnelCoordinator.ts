import { paint } from '@seedcord/logger';

import { formatUptime } from '@ui/format';

import type { CloudflaredTunnel } from './CloudflaredTunnel';
import type { InteractionsEndpoint } from './InteractionsEndpoint';
import type { ILogger } from '@seedcord/types';

const PASTE_HINT = 'The tunnel is still up, so try pasting that URL into the dashboard.';
const RESTART_HINT = 'Restart for a fresh hostname, or set `tunnel` to an https URL you already serve.';

export type CoordinatorTunnel = Pick<CloudflaredTunnel, 'open' | 'stop'>;

export interface CoordinatorDeps {
    readonly makeTunnel: () => CoordinatorTunnel;
    // a quick hostname is gone after the session, so its endpoint is cleared on quit
    readonly kind: 'quick' | 'configured';
    readonly endpoint: Pick<InteractionsEndpoint, 'set' | 'clear'>;
    readonly onUrl: (url: string | null) => void;
    readonly logger: ILogger;
}

// a call, because a direct read of signal.aborted narrows to false past the first check
function superseded(attempt: AbortController): boolean {
    return attempt.signal.aborted;
}

function opening(kind: CoordinatorDeps['kind']): string {
    return kind === 'quick' ? 'Requesting a cloudflared tunnel to port' : 'Checking if your tunnel reaches port';
}

export class TunnelCoordinator {
    private target: number | undefined;
    private current: AbortController | undefined;

    constructor(private readonly deps: CoordinatorDeps) {}

    public async onPort(port: number): Promise<void> {
        if (this.target === port) return;

        this.target = port;
        const attempt = this.begin();
        const startedAt = Date.now();
        const since = (): string => paint.mute(`+${formatUptime(Date.now() - startedAt)}`);
        const tunnel = this.deps.makeTunnel();
        // a later onPort holds no handle on this tunnel, so abort contains the stop
        attempt.signal.addEventListener('abort', () => tunnel.stop(), { once: true });
        let patched = false;

        try {
            this.deps.logger.info(`${opening(this.deps.kind)} ${paint.iris(String(port))}`);
            const url = await tunnel.open(attempt.signal, port);
            if (superseded(attempt)) return;
            this.deps.logger.info(`Reachable at ${paint.sky.italic(url)} ${since()}`);

            patched = true;
            await this.deps.endpoint.set(url, attempt.signal);
            if (superseded(attempt)) return;

            this.deps.onUrl(url);
            this.deps.logger.info(`Interactions endpoint set to ${paint.sky.italic(url)} ${since()}`);
        } catch (error: unknown) {
            if (superseded(attempt)) return;
            // stop from attempting a patch because discord refuses a hostname it previously refused
            if (patched) attempt.abort();

            // so the next restart on this port retries
            this.target = undefined;
            this.deps.onUrl(null);
            this.deps.logger.error('Tunnel setup failed, the bot runs without a public endpoint', error);
            // pasting works exactly when the tunnel survived, which is the same condition as the abort above
            if (this.deps.kind === 'quick') this.deps.logger.info(patched ? RESTART_HINT : PASTE_HINT);
        }
    }

    public async stop(): Promise<void> {
        if (!this.current) return;

        this.target = undefined;
        this.current.abort();
        this.current = undefined;
        this.deps.onUrl(null);
        if (this.deps.kind === 'configured') return;

        try {
            await this.deps.endpoint.clear();
        } catch (error: unknown) {
            // a failed clear must not reject the quit path
            this.deps.logger.warn('Could not clear the interactions endpoint', error);
        }
    }

    private begin(): AbortController {
        this.current?.abort();
        this.current = new AbortController();
        return this.current;
    }
}
