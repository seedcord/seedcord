import type { EpochMs } from '@seedcord/types';

const SWEEP_INTERVAL_MS = 60_000;

/**
 * A usage window for a {@link RateLimiter} key.
 */
export interface RateLimitWindow {
    /** Window length in milliseconds. */
    delay: number;
    /**
     * Hits allowed inside the window before the key is limited.
     *
     * @defaultValue `1`
     */
    limit?: number;
}

/**
 * The outcome of a {@link RateLimiter.hit}.
 */
export interface RateLimitResult {
    /** Whether the key is at or over its limit for the current window. */
    limited: boolean;
    /** Absolute epoch milliseconds when the key next frees up. Convert to seconds for Discord timestamp markup. */
    expires: EpochMs;
}

/**
 * Tracks per-key usage windows and reports when a key is limited and when it frees up.
 *
 * Each key holds a sliding window of hit expiry times, and is limited once its live-hit count
 * reaches the window's `limit`. Expired hits are dropped on the next read, and a background sweep
 * drops fully-expired keys so the map does not grow without bound.
 */
export class RateLimiter {
    private readonly map = new Map<string, number[]>();

    constructor() {
        // keep the sweep from holding the process open
        setInterval(() => {
            this.sweep();
        }, SWEEP_INTERVAL_MS).unref();
    }

    /** Number of keys currently tracked. */
    get size(): number {
        return this.map.size;
    }

    /**
     * Records a hit for `key` and reports whether the key is now limited.
     *
     * @param key - The bucket to record against. The caller builds it from its own scope.
     * @param window - The usage window to apply for this hit.
     */
    hit(key: string, window: RateLimitWindow): RateLimitResult {
        const now = Date.now();
        // a window must allow at least one hit, so 0 or a negative never means "block everything"
        const limit = Math.max(1, window.limit ?? 1);

        const live = this.live(key, now);

        if (live.length >= limit) {
            this.map.set(key, live);
            // soonest a slot frees is the earliest expiry
            return { limited: true, expires: Math.min(...live) as EpochMs };
        }

        const expires: EpochMs = (now + window.delay) as EpochMs;
        live.push(expires);
        this.map.set(key, live);

        return { limited: false, expires };
    }

    /**
     * Reports whether `key` is limited right now without recording a hit.
     *
     * The read half of a peek-then-commit. A gate calls `peek` to decide whether to refuse, and
     * `hit` to charge the slot only once it is the gate that let the request through.
     */
    peek(key: string, window: RateLimitWindow): RateLimitResult {
        const now = Date.now();
        const limit = Math.max(1, window.limit ?? 1);
        // a read, so it never writes the filtered hits back, hit owns the only mutation
        const live = this.live(key, now);

        if (live.length >= limit) return { limited: true, expires: Math.min(...live) as EpochMs };
        return { limited: false, expires: (now + window.delay) as EpochMs };
    }

    private live(key: string, now: number): number[] {
        return (this.map.get(key) ?? []).filter((exp) => exp > now);
    }

    private sweep(): void {
        const now = Date.now();
        for (const [key, live] of this.map) {
            const kept = live.filter((exp) => exp > now);
            if (kept.length === 0) this.map.delete(key);
            else this.map.set(key, kept);
        }
    }
}
