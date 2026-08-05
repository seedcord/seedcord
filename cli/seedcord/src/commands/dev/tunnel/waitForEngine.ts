import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { TunnelDeps } from './CloudflaredTunnel';

const UNAUTHORIZED = 401;
const POLL_INTERVAL_MS = 500;
const POLL_ATTEMPTS = 180;

export type ProbeDeps = Pick<TunnelDeps, 'fetch' | 'wait'>;

// an unsigned POST reaches the engine on any path, since the health responder answers GET alone
export async function waitForEngine(url: string, deps: ProbeDeps, signal: AbortSignal): Promise<void> {
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        signal.throwIfAborted();
        if (await refused(url, deps, signal)) return;
        await deps.wait(POLL_INTERVAL_MS);
    }

    throw new SeedcordError(SeedcordErrorCode.CliTunnelNotRouting, [url, (POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000]);
}

async function refused(url: string, deps: ProbeDeps, signal: AbortSignal): Promise<boolean> {
    try {
        const response = await deps.fetch(url, { method: 'POST', signal });
        return response.status === UNAUTHORIZED;
    } catch {
        return false;
    }
}
