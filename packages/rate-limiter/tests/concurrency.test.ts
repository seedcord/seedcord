import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { MemoryRateLimiter } from '../src/MemoryRateLimiter';

describe('MemoryRateLimiter concurrent charges', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('admits exactly limit charges when many fire in one frozen tick', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 1000, limit: 3 };

        const results = await Promise.all(Array.from({ length: 5 }, () => limiter.charge('user', window)));

        const open = results.filter((r) => !r.limited);
        const limited = results.filter((r) => r.limited);
        expect(open).toHaveLength(3);
        expect(limited).toHaveLength(2);
    });
});
