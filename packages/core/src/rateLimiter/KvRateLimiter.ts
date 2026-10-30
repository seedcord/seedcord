import type { Kv } from '#src/kv/Kv';
import type { KvCollection } from '#src/kv/KvCollection';
import type { EpochMs, IRateLimiter, RateLimitResult, RateLimitWindow } from '@seedcord/types';

function limitedResult(live: readonly number[], now: number): RateLimitResult {
    // soonest a slot frees is the earliest expiry. a reduce, because spreading into Math.min throws past the argument cap
    const resetAt = live.reduce((earliest, exp) => Math.min(earliest, exp), Number.POSITIVE_INFINITY) as EpochMs;
    return { limited: true, resetAt, remaining: 0, retryAfterMs: resetAt - now };
}

function openResult(remaining: number): RateLimitResult {
    return { limited: false, resetAt: 0 as EpochMs, remaining, retryAfterMs: 0 };
}

// 0 or a negative limit never means "block everything"
function limitOf(window: RateLimitWindow): number {
    return Math.max(1, window.limit ?? 1);
}

function liveUses(stored: readonly number[] | undefined, now: number): number[] {
    return (stored ?? []).filter((exp) => exp > now);
}

/**
 * The {@link IRateLimiter} behind `core.rateLimiter`. It keeps an exact sliding window per key and
 * saves each use's expiry time in `config.kv`.
 */
export class KvRateLimiter implements IRateLimiter {
    private readonly uses: KvCollection<number[]>;

    constructor(kv: Kv) {
        this.uses = kv.collection<number[]>('rate-limit');
    }

    public async charge(key: string, window: RateLimitWindow): Promise<RateLimitResult> {
        const now = Date.now();
        const limit = limitOf(window);
        return this.uses.update(key, (stored) => {
            const live = liveUses(stored, now);
            const limited = live.length >= limit;
            if (!limited) live.push(now + window.windowMs);

            const result = limited ? limitedResult(live, now) : openResult(limit - live.length);
            const latest = live.reduce((max, exp) => Math.max(max, exp), now);
            return { value: live, result, ttlMs: latest - now };
        });
    }

    public async peek(key: string, window: RateLimitWindow): Promise<RateLimitResult> {
        const now = Date.now();
        const limit = limitOf(window);
        const live = liveUses(await this.uses.get(key), now);
        return live.length >= limit ? limitedResult(live, now) : openResult(limit - live.length);
    }

    public async reset(key: string): Promise<void> {
        await this.uses.delete(key);
    }
}
