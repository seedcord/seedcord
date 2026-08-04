import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { TunnelDeps } from './CloudflaredTunnel';

const METHOD_NOT_ALLOWED = 405;
const POLL_INTERVAL_MS = 500;
const POLL_ATTEMPTS = 30;

export type ProbeDeps = Pick<TunnelDeps, 'fetch' | 'wait'>;

// the engine answers 405 to any GET, which no cloudflare edge error can imitate
export async function waitForEngine(url: string, deps: ProbeDeps): Promise<void> {
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        if (await answered(url, deps)) return;
        await deps.wait(POLL_INTERVAL_MS);
    }

    throw new SeedcordError(SeedcordErrorCode.CliTunnelNotRouting, [url, (POLL_ATTEMPTS * POLL_INTERVAL_MS) / 1000]);
}

async function answered(url: string, deps: ProbeDeps): Promise<boolean> {
    try {
        const response = await deps.fetch(url);
        return response.status === METHOD_NOT_ALLOWED;
    } catch {
        return false;
    }
}
