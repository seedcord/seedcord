const SWEEP_INTERVAL_MS = 60_000;

/**
 * A usage window for a {@link RateLimiter} key.
 */
export interface RateLimitWindow {
    /** Window length in milliseconds. */
    delay: number;
    /** Hits allowed inside the window before the key is limited. Defaults to `1`. */
    limit?: number;
}

/**
 * The outcome of a {@link RateLimiter.hit}.
 */
export interface RateLimitResult {
    /** Whether the key is at or over its limit for the current window. */
    limited: boolean;
    /**
     * Absolute epoch milliseconds when the key next frees up. Discord timestamp markup
     * (`<t:...:R>`) takes seconds, so divide by 1000 before rendering it.
     */
    expires: number;
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

        const live = (this.map.get(key) ?? []).filter((exp) => exp > now);

        if (live.length >= limit) {
            this.map.set(key, live);
            // soonest a slot frees is the earliest expiry
            return { limited: true, expires: Math.min(...live) };
        }

        const expires = now + window.delay;
        live.push(expires);
        this.map.set(key, live);

        return { limited: false, expires };
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
