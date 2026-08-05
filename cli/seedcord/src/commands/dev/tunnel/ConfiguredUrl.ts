import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { TunnelDeps } from './CloudflaredTunnel';

const UNAUTHORIZED = 401;
const POLL_INTERVAL_MS = 500;
const POLL_ATTEMPTS = 10; // a stable hostname answers the first probe, the rest covers a forwarder still starting

export type ProbeDeps = Pick<TunnelDeps, 'fetch' | 'wait'>;

// an unsigned POST reaches the engine on any path, since the health responder answers GET alone
async function refused(url: string, deps: ProbeDeps, signal: AbortSignal): Promise<boolean> {
    try {
        const response = await deps.fetch(url, { method: 'POST', signal });
        return response.status === UNAUTHORIZED;
    } catch {
        return false;
    }
}

export class ConfiguredUrl {
    constructor(
        private readonly url: string,
        private readonly deps: ProbeDeps
    ) {}

    public async open(port: number, signal: AbortSignal): Promise<string> {
        for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
            signal.throwIfAborted();
            if (await refused(this.url, this.deps, signal)) return this.url;
            await this.deps.wait(POLL_INTERVAL_MS);
        }

        throw new SeedcordError(SeedcordErrorCode.CliTunnelUnreachable, [
            this.url,
            port,
            (POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000
        ]);
    }

    public stop(): void {
        // the forwarder is the user's process
    }
}
