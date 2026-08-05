const REPLAY_WINDOW_MS = 300_000; // compared in both directions, clock skew stays inside the window
const SWEEP_GAP_MS = 60_000;
const MS_PER_SECOND = 1000;
const TIMESTAMP_PATTERN = /^\d+$/;

// the seen map is per-isolate on edge, so a fresh isolate rejects a replay on freshness alone
export class ReplayGuard {
    private readonly seen = new Map<string, number>();
    private lastSweep = Date.now();

    public fresh(timestampHeader: string): boolean {
        if (!TIMESTAMP_PATTERN.test(timestampHeader)) return false;
        const timestampMs = Number(timestampHeader) * MS_PER_SECOND;
        return Math.abs(Date.now() - timestampMs) <= REPLAY_WINDOW_MS;
    }

    // runs after fresh() and after signature verification, so the map stores only fresh discord-signed values
    public unseen(signatureHex: string, timestampHeader: string): boolean {
        const now = Date.now();
        this.maybeSweep(now);

        // >= because a timestamp at the exact stale edge is accepted and its entry expires at `now`
        const rejectUntil = this.seen.get(signatureHex);
        if (rejectUntil !== undefined && rejectUntil >= now) return false;

        // expires when the freshness check starts rejecting this timestamp
        this.seen.set(signatureHex, Number(timestampHeader) * MS_PER_SECOND + REPLAY_WINDOW_MS);
        return true;
    }

    // swept on access, a construction-time timer throws in workers global scope
    private maybeSweep(now: number): void {
        if (now - this.lastSweep < SWEEP_GAP_MS) return;
        this.lastSweep = now;
        // strict, the sweep runs before the dedup lookup and must keep an entry expiring exactly at `now`
        for (const [signature, rejectUntil] of this.seen) {
            if (rejectUntil < now) this.seen.delete(signature);
        }
    }
}
