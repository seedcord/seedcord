import type { EpochMs, RateLimitResult, RateLimitWindow } from '@seedcord/types';
import type { Store, StoreKind } from '@seedcord/types/internal';

const SWEEP_GAP_MS = 60_000;

function limitedResult(live: readonly number[], now: number): RateLimitResult {
    // soonest a slot frees is the earliest expiry. a reduce, because spreading into Math.min throws past the argument cap
    const resetAt = live.reduce((earliest, exp) => Math.min(earliest, exp), Number.POSITIVE_INFINITY) as EpochMs;
    return { limited: true, resetAt, remaining: 0, retryAfterMs: resetAt - now };
}

function openResult(remaining: number): RateLimitResult {
    return { limited: false, resetAt: 0 as EpochMs, remaining, retryAfterMs: 0 };
}

/**
 * The in-memory {@link IRateLimiter} with an exact sliding window per key. The gateway default behind
 * `core.rateLimiter`.
 *
 * Each key holds its live uses' expiry times. State is per-process and lost on restart. Expired keys
 * are dropped on the first access at least a minute after the previous sweep.
 */
export class MemoryRateLimiter implements Store<'charge'> {
    /** @internal */
    public readonly kind: StoreKind = 'memory';
    /** @internal */
    public readonly caps: ReadonlySet<'charge'> = new Set(['charge']);

    private readonly map = new Map<string, number[]>();
    private lastSweep = Date.now();

    /** Number of keys currently tracked. */
    public get size(): number {
        return this.map.size;
    }

    public charge(key: string, window: RateLimitWindow): Promise<RateLimitResult> {
        const now = Date.now();
        this.maybeSweep(now);
        // a window must allow at least one use, so 0 or a negative never means "block everything"
        const limit = Math.max(1, window.limit ?? 1);
        const live = this.live(key, now);

        if (live.length >= limit) {
            this.map.set(key, live);
            return Promise.resolve(limitedResult(live, now));
        }

        live.push(now + window.windowMs);
        this.map.set(key, live);
        return Promise.resolve(openResult(limit - live.length));
    }

    public peek(key: string, window: RateLimitWindow): Promise<RateLimitResult> {
        const now = Date.now();
        this.maybeSweep(now);
        const limit = Math.max(1, window.limit ?? 1);
        // a read, the filtered list is never written back
        const live = this.live(key, now);

        if (live.length >= limit) return Promise.resolve(limitedResult(live, now));
        return Promise.resolve(openResult(limit - live.length));
    }

    public reset(key: string): Promise<void> {
        this.maybeSweep(Date.now());
        this.map.delete(key);
        return Promise.resolve();
    }

    private live(key: string, now: number): number[] {
        return (this.map.get(key) ?? []).filter((exp) => exp > now);
    }

    // sweeps on access so construction is safe where global-scope timers throw (workers)
    private maybeSweep(now: number): void {
        if (now - this.lastSweep < SWEEP_GAP_MS) return;
        this.lastSweep = now;
        for (const [key, live] of this.map) {
            const kept = live.filter((exp) => exp > now);
            if (kept.length === 0) this.map.delete(key);
            else this.map.set(key, kept);
        }
    }
}
