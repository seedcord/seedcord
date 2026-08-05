import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { paint } from '@seedcord/logger';

import { formatUptime } from '@ui/format';

import type { CloudflaredTunnel } from './CloudflaredTunnel';
import type { InteractionsEndpoint } from './InteractionsEndpoint';
import type { ILogger } from '@seedcord/types';

const STABLE_URL_HINT =
    'The tunnel is still running, so paste that URL into the dashboard by hand. Setting `tunnel` to a stable https URL in seedcord.config.ts avoids this.';

interface Published {
    readonly url: string;
    readonly verified: boolean;
}

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

        try {
            const published = await this.publish(port, attempt, since);
            if (published === undefined) return;

            this.deps.onUrl(published.url);
            if (published.verified) {
                this.deps.logger.info(`Interactions endpoint set to ${paint.sky.italic(published.url)} ${since()}`);
                return;
            }
            if (this.deps.kind === 'quick') this.deps.logger.info(STABLE_URL_HINT);
        } catch (error: unknown) {
            if (superseded(attempt)) return;
            attempt.abort();

            // so the next restart on this port retries
            this.target = undefined;
            this.deps.onUrl(null);
            this.deps.logger.error('Tunnel setup failed, the bot runs without a public endpoint', error);
            if (
                this.deps.kind === 'quick' &&
                isSeedcordError(error, undefined, SeedcordErrorCode.CliTunnelNotVerified)
            ) {
                this.deps.logger.info(STABLE_URL_HINT);
            }
        }
    }

    public async stop(): Promise<void> {
        if (this.target === undefined) return;

        this.target = undefined;
        this.current?.abort();
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

    private async publish(port: number, attempt: AbortController, since: () => string): Promise<Published | undefined> {
        const tunnel = this.deps.makeTunnel();
        // a later onPort holds no handle on this tunnel, so abort contains the stop
        attempt.signal.addEventListener('abort', () => tunnel.stop(), { once: true });

        const url = await tunnel.open(port, attempt.signal);
        if (superseded(attempt)) return undefined;
        this.deps.logger.info(`Reachable at ${paint.sky.italic(url)} ${since()}`);

        try {
            await this.deps.endpoint.set(url, attempt.signal);
        } catch (error: unknown) {
            if (superseded(attempt)) return undefined;
            if (!isSeedcordError(error, undefined, SeedcordErrorCode.CliTunnelNotVerified)) throw error;

            // the tunnel keeps running, so the url stays pasteable
            this.deps.logger.error('Discord refused this endpoint', error);
            return { url, verified: false };
        }
        return superseded(attempt) ? undefined : { url, verified: true };
    }

    private begin(): AbortController {
        this.current?.abort();
        this.current = new AbortController();
        return this.current;
    }
}
