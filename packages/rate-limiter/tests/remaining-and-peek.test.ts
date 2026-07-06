import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { MemoryRateLimiter } from '../src/MemoryRateLimiter';

describe('MemoryRateLimiter remaining semantics', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('reports one fewer remaining on charge than on peek for the same state', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 1000, limit: 1 };

        // peek is advisory, so a fresh key shows the slot as still available
        expect(await limiter.peek('user', window)).toMatchObject({ remaining: 1 });
        // charge is exact, so consuming the slot leaves none
        expect(await limiter.charge('user', window)).toMatchObject({ remaining: 0 });
    });

    it('keeps peek remaining constant across repeated peeks and records nothing', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 1000, limit: 3 };

        expect(await limiter.peek('user', window)).toMatchObject({ remaining: 3 });
        expect(await limiter.peek('user', window)).toMatchObject({ remaining: 3 });
        expect(await limiter.peek('user', window)).toMatchObject({ remaining: 3 });
        expect(limiter.size).toBe(0);
    });
});
