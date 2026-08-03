import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { MemoryRateLimiter } from '@src/MemoryRateLimiter';

describe('MemoryRateLimiter retryAfterMs and resetAt math', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('shrinks retryAfterMs as time passes while resetAt stays fixed', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 1000 };
        const start = Date.now();
        await limiter.charge('user', window);

        const first = await limiter.peek('user', window);
        expect(first.resetAt).toBe(start + 1000);
        expect(first.retryAfterMs).toBe(1000);

        vi.advanceTimersByTime(400);
        const later = await limiter.peek('user', window);
        expect(later.resetAt).toBe(start + 1000);
        expect(later.retryAfterMs).toBe(600);
    });

    it('reports retryAfterMs as resetAt minus the call-time now', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 5000 };
        await limiter.charge('user', window);

        vi.advanceTimersByTime(1234);
        const result = await limiter.peek('user', window);
        expect(result.retryAfterMs).toBe(result.resetAt - Date.now());
        expect(result.retryAfterMs).toBe(3766);
    });
});
