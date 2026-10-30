import type { Kv } from '#src/kv/Kv';
import type { KvCollection } from '#src/kv/KvCollection';
import type { EpochMs, IRateLimiter, RateLimitResult, RateLimitWindow } from '@seedcord/types';

function limitedResult(live: readonly number[], now: number): RateLimitResult {
    // a reduce, because spreading into Math.min throws past the argument cap
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

export class KvRateLimiter implements IRateLimiter {
    private readonly uses: KvCollection<number[]>;

    constructor(kv: Kv) {
        this.uses = kv.collection<number[]>('rate-limit');
    }

    public async charge(key: string, window: RateLimitWindow): Promise<RateLimitResult> {
        const limit = limitOf(window);
        // update() calls the callback before it resolves
        let result!: RateLimitResult;
        await this.uses.update(
            key,
            (stored) => {
                // read here, since this callback can wait in the queue behind other charges
                const now = Date.now();
                const live = liveUses(stored, now);
                const limited = live.length >= limit;
                if (!limited) live.push(now + window.windowMs);
                result = limited ? limitedResult(live, now) : openResult(limit - live.length);
                return live;
            },
            (live) => live.reduce((latest, exp) => Math.max(latest, exp), 0) - Date.now()
        );
        return result;
    }

    public async peek(key: string, window: RateLimitWindow): Promise<RateLimitResult> {
        const stored = await this.uses.get(key);
        const now = Date.now();
        const limit = limitOf(window);
        const live = liveUses(stored, now);
        return live.length >= limit ? limitedResult(live, now) : openResult(limit - live.length);
    }

    public async reset(key: string): Promise<void> {
        await this.uses.delete(key);
    }
}
