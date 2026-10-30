import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Kv } from '#src/kv/Kv';
import { MemoryDriver } from '#src/kv/MemoryDriver';
import { KvRateLimiter } from '#src/rateLimiter/KvRateLimiter';
import { memoryRateLimiter } from '#tests/utils/memoryRateLimiter';

class SlowReadDriver extends MemoryDriver {
    public override get(key: string): string | undefined {
        const value = super.get(key);
        vi.setSystemTime(Date.now() + 2);
        return value;
    }
}

describe('KvRateLimiter remaining semantics', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('reports one fewer remaining on charge than on peek for the same state', async () => {
        const limiter = memoryRateLimiter();
        const window = { windowMs: 1000, limit: 1 };

        // peek is advisory, so a fresh key shows the slot as still available
        expect(await limiter.peek('user', window)).toMatchObject({ remaining: 1 });
        // charge is exact, so consuming the slot leaves none
        expect(await limiter.charge('user', window)).toMatchObject({ remaining: 0 });
    });

    it('keeps peek remaining constant across repeated peeks and records nothing', async () => {
        const limiter = memoryRateLimiter();
        const window = { windowMs: 1000, limit: 3 };

        expect(await limiter.peek('user', window)).toMatchObject({ remaining: 3 });
        expect(await limiter.peek('user', window)).toMatchObject({ remaining: 3 });
        expect(await limiter.peek('user', window)).toMatchObject({ remaining: 3 });
        expect(await limiter.charge('user', window)).toMatchObject({ remaining: 2 });
    });

    it('stops counting a use that expires while peek reads it', async () => {
        const limiter = new KvRateLimiter(new Kv(new SlowReadDriver()));
        const window = { windowMs: 1000, limit: 2 };
        await limiter.charge('user', window);
        vi.advanceTimersByTime(500);
        await limiter.charge('user', window);

        vi.advanceTimersByTime(497);
        expect(await limiter.peek('user', window)).toMatchObject({ limited: false, remaining: 1 });
    });
});
