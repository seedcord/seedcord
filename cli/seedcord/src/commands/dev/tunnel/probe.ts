const UNAUTHORIZED = 401;
const POLL_INTERVAL_MS = 250;
const BUDGET_MS = 60_000;

export const PROBE_SECONDS = BUDGET_MS / 1000;

export interface ProbeDeps {
    fetch: (url: string, init?: RequestInit) => Promise<Response>;
    wait: (ms: number) => Promise<void>;
}

// an unsigned POST reaches the engine on any path, and only a seedcord bot answers it with a 401
export async function awaitReachable(url: string, deps: ProbeDeps, signal: AbortSignal): Promise<boolean> {
    // one budget shared by every request, so a slow answer still gets the time left in it
    const budget = AbortSignal.any([signal, AbortSignal.timeout(BUDGET_MS)]);

    for (let attempt = 0; attempt < BUDGET_MS / POLL_INTERVAL_MS; attempt++) {
        try {
            const response = await deps.fetch(url, { method: 'POST', signal: budget });
            if (response.status === UNAUTHORIZED) return true;
        } catch {
            signal.throwIfAborted();
        }
        await deps.wait(POLL_INTERVAL_MS);
    }

    return false;
}
