import type { EpochMs } from '../Types/Epoch';

/**
 * A usage window for an {@link IRateLimiter} key.
 */
export interface RateLimitWindow {
    /** The sliding-window length. */
    windowMs: number;
    /**
     * Uses allowed inside the window before the key is limited.
     *
     * @defaultValue `1`
     */
    limit?: number;
}

/**
 * The outcome of an {@link IRateLimiter} `charge` or `peek`.
 */
export interface RateLimitResult {
    /** Whether the key is at or over its limit for the current window. */
    limited: boolean;
    /**
     * Absolute epoch milliseconds when the earliest slot frees up, for `<t:...:R>` markup after a
     * divide by 1000. `0` when not limited.
     */
    resetAt: EpochMs;
    /** Slots left in the current window. Exact after a `charge`, advisory on a `peek`. */
    remaining: number;
    /** Milliseconds until {@link RateLimitResult.resetAt}. `0` when not limited. */
    retryAfterMs: number;
}

/**
 * Sliding-window rate limiting keyed by caller-built strings, available as `core.rateLimiter`.
 *
 * Async so one interface spans the in-memory default and durable store backends. The in-memory
 * implementation resolves synchronously, so the `await` costs no event-loop yield.
 */
export interface IRateLimiter {
    /**
     * Records a use of `key` if the window has a free slot, in one atomic step.
     *
     * @param key - The bucket to charge. Build it from your own scope, or with `buildKey` from `@seedcord/rate-limiter`.
     * @param window - The usage window to apply.
     */
    charge(key: string, window: RateLimitWindow): Promise<RateLimitResult>;
    /**
     * Reports `key`'s limited state without recording a use.
     *
     * The read half of a peek-then-commit. The `Cooldown` gate peeks in its check and charges in its
     * commit, so a refusal elsewhere in the gate set never burns the slot.
     */
    peek(key: string, window: RateLimitWindow): Promise<RateLimitResult>;
    /** Clears `key`'s recorded uses. */
    reset(key: string): Promise<void>;
}
