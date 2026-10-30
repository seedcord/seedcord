import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { memoryRateLimiter } from '#tests/utils/memoryRateLimiter';

describe('KvRateLimiter', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('reports not limited on the first charge of a fresh key', async () => {
        const limiter = memoryRateLimiter();

        const result = await limiter.charge('user', { windowMs: 1000 });

        expect(result.limited).toBe(false);
        expect(result.resetAt).toBe(0);
        expect(result.retryAfterMs).toBe(0);
        expect(result.remaining).toBe(0);
    });

    it('limits the second charge inside the window and reports when the slot frees', async () => {
        const limiter = memoryRateLimiter();

        await limiter.charge('user', { windowMs: 1000 });
        const second = await limiter.charge('user', { windowMs: 1000 });

        expect(second.limited).toBe(true);
        expect(second.resetAt).toBe(Date.now() + 1000);
        expect(second.retryAfterMs).toBe(1000);
        expect(second.remaining).toBe(0);
    });

    it('allows up to limit charges inside the window and counts remaining down', async () => {
        const limiter = memoryRateLimiter();
        const window = { windowMs: 1000, limit: 3 };

        expect(await limiter.charge('user', window)).toMatchObject({ limited: false, remaining: 2 });
        expect(await limiter.charge('user', window)).toMatchObject({ limited: false, remaining: 1 });
        expect(await limiter.charge('user', window)).toMatchObject({ limited: false, remaining: 0 });
        expect(await limiter.charge('user', window)).toMatchObject({ limited: true, remaining: 0 });
    });

    it('frees the key again once the window passes', async () => {
        const limiter = memoryRateLimiter();

        await limiter.charge('user', { windowMs: 1000 });
        const blocked = await limiter.charge('user', { windowMs: 1000 });
        expect(blocked.limited).toBe(true);

        vi.advanceTimersByTime(1000);

        const freed = await limiter.charge('user', { windowMs: 1000 });
        expect(freed.limited).toBe(false);
    });

    it('treats a limit below 1 as 1', async () => {
        const limiter = memoryRateLimiter();

        const first = await limiter.charge('user', { windowMs: 1000, limit: 0 });
        const second = await limiter.charge('user', { windowMs: 1000, limit: 0 });
        expect(first.limited).toBe(false);
        expect(second.limited).toBe(true);
    });

    it('peek reports a fresh key as open', async () => {
        const limiter = memoryRateLimiter();

        const peeked = await limiter.peek('user', { windowMs: 1000, limit: 3 });

        expect(peeked).toMatchObject({ limited: false, remaining: 3, resetAt: 0, retryAfterMs: 0 });
    });

    it('peek reports limited with the soonest reset and never extends the window', async () => {
        const limiter = memoryRateLimiter();
        const window = { windowMs: 1000 };
        await limiter.charge('user', window);

        const peeked = await limiter.peek('user', window);
        expect(peeked.limited).toBe(true);
        expect(peeked.resetAt).toBe(Date.now() + 1000);

        vi.advanceTimersByTime(500);
        await limiter.peek('user', window);
        vi.advanceTimersByTime(500);
        expect(await limiter.charge('user', window)).toMatchObject({ limited: false });
    });

    it('reset clears the key so the next charge starts a fresh window', async () => {
        const limiter = memoryRateLimiter();

        await limiter.charge('user', { windowMs: 1000 });
        const before = await limiter.peek('user', { windowMs: 1000 });
        expect(before.limited).toBe(true);

        await limiter.reset('user');

        const after = await limiter.charge('user', { windowMs: 1000 });
        expect(after.limited).toBe(false);
    });
});
