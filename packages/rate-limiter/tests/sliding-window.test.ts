import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { MemoryRateLimiter } from '@src/MemoryRateLimiter';

describe('MemoryRateLimiter sliding window', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('keeps a slot limited through windowMs-1 and frees it at windowMs', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 1000 };
        await limiter.charge('user', window);

        vi.advanceTimersByTime(999);
        expect(await limiter.peek('user', window)).toMatchObject({ limited: true });

        vi.advanceTimersByTime(1);
        expect(await limiter.peek('user', window)).toMatchObject({ limited: false });
    });

    it('frees one staggered slot at a time as each expiry passes', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 1000, limit: 3 };
        const start = Date.now();

        await limiter.charge('user', window);
        vi.advanceTimersByTime(300);
        await limiter.charge('user', window);
        vi.advanceTimersByTime(300);
        await limiter.charge('user', window);

        expect(await limiter.peek('user', window)).toMatchObject({ limited: true });

        vi.advanceTimersByTime(400);
        const afterFirstExpiry = await limiter.charge('user', window);
        expect(afterFirstExpiry.limited).toBe(false);

        const refull = await limiter.peek('user', window);
        expect(refull.limited).toBe(true);
        // resetAt moved off the expired first slot to the next earliest, so the window slid
        expect(refull.resetAt).toBe(start + 1300);
    });

    it('reports resetAt as the earliest live expiry', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 1000, limit: 2 };
        const start = Date.now();

        await limiter.charge('user', window);
        vi.advanceTimersByTime(500);
        await limiter.charge('user', window);

        const peeked = await limiter.peek('user', window);
        expect(peeked.limited).toBe(true);
        expect(peeked.resetAt).toBe(start + 1000);
    });

    it('counts only live uses and excludes an expired one from resetAt', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 1000, limit: 2 };
        const start = Date.now();

        await limiter.charge('user', window);
        vi.advanceTimersByTime(400);
        await limiter.charge('user', window);

        vi.advanceTimersByTime(600);
        const freed = await limiter.charge('user', window);
        expect(freed.limited).toBe(false);

        const peeked = await limiter.peek('user', window);
        expect(peeked.limited).toBe(true);
        expect(peeked.resetAt).toBe(start + 1400);
    });
});
