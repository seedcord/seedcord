import { paint } from '@seedcord/errors';

import { formatUptime } from '#ui/format';

import type { CloudflaredTunnel } from './CloudflaredTunnel';
import type { InteractionsEndpoint } from './InteractionsEndpoint';
import type { ILogger } from '@seedcord/types';

const PASTE_HINT = 'The tunnel is still up, so try pasting that URL into the dashboard.';
const RESTART_HINT = 'Restart for a fresh hostname, or set `tunnel` to an https URL you already serve.';

export type CoordinatorTunnel = Pick<CloudflaredTunnel, 'open' | 'stop'>;

export type TunnelPhase = 'opening' | 'resolving' | 'registering';
export type TunnelStatus = TunnelPhase | 'live' | 'lost';

export interface CoordinatorDeps {
    readonly makeTunnel: (onLost: () => void) => CoordinatorTunnel;
    // a quick hostname lasts only as long as this process, so quit clears the endpoint
    readonly kind: 'quick' | 'configured';
    readonly endpoint: Pick<InteractionsEndpoint, 'set' | 'clear'>;
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

            this.deps.onStatus('registering');
            patched = true;
            await this.deps.endpoint.set(url, attempt.signal);
            if (superseded(attempt)) return;

            this.deps.onStatus('live');
            this.deps.logger.info(`Interactions endpoint set on the dev dashboard ${since()}`);
        } catch (error: unknown) {
            if (superseded(attempt)) return;
            // discord will refuse the same hostname again
            if (patched) attempt.abort();
            this.reportFailure(error, patched);
        }
    }

    private reportLost(attempt: AbortController): void {
        if (superseded(attempt)) return;

        this.target = undefined;
        this.deps.onStatus('lost');
        this.deps.logger.error('cloudflared exited, so the bot has no public endpoint');
    }

    private reportFailure(error: unknown, patched: boolean): void {
        // so a retry on this port is not skipped
        this.target = undefined;
        this.deps.onStatus(null);
        this.deps.logger.error('Tunnel setup failed, the bot runs without a public endpoint', error);
        // patched means the abort above stopped the tunnel. the paste hint only holds while it is up.
        if (this.deps.kind === 'quick') this.deps.logger.info(patched ? RESTART_HINT : PASTE_HINT);
    }

    public async stop(): Promise<void> {
        if (!this.current) return;

        this.target = undefined;
        this.current.abort();
        this.current = undefined;
        this.deps.onStatus(null);
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
