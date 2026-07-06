import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { MemoryRateLimiter } from '../src/MemoryRateLimiter';

describe('MemoryRateLimiter degenerate windows', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('never limits when the window length is zero', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 0 };

        // a zero-length use expires the instant it records, so it is never live
        expect(await limiter.charge('user', window)).toMatchObject({ limited: false });
        expect(await limiter.charge('user', window)).toMatchObject({ limited: false });
    });

    it('never limits when the window length is negative', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: -500 };

        expect(await limiter.charge('user', window)).toMatchObject({ limited: false });
        expect(await limiter.charge('user', window)).toMatchObject({ limited: false });
    });

    it('reports a fractional resetAt and retryAfterMs for a fractional window length', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 1000.5 };
        const start = Date.now();
        await limiter.charge('user', window);

        const limited = await limiter.charge('user', window);
        expect(limited.limited).toBe(true);
        expect(limited.resetAt).toBe(start + 1000.5);
        expect(limited.retryAfterMs).toBe(1000.5);
    });

    it('never limits while charges stay below a very large limit', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 1000, limit: 1_000_000 };

        expect(await limiter.charge('user', window)).toMatchObject({ remaining: 999_999 });
        expect(await limiter.charge('user', window)).toMatchObject({ remaining: 999_998 });
        expect(await limiter.charge('user', window)).toMatchObject({ limited: false });
    });

    it('allows ceil(limit) charges when the limit is fractional', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 1000, limit: 2.5 };

        expect(await limiter.charge('user', window)).toMatchObject({ limited: false });
        expect(await limiter.charge('user', window)).toMatchObject({ limited: false });
        expect(await limiter.charge('user', window)).toMatchObject({ limited: false });
        expect(await limiter.charge('user', window)).toMatchObject({ limited: true });
    });
});
