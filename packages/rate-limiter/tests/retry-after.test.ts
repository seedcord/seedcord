import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { MemoryRateLimiter } from '../src/MemoryRateLimiter';

describe('MemoryRateLimiter retryAfter and resetAt math', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('shrinks retryAfter as time passes while resetAt stays fixed', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { delay: 1000 };
        const start = Date.now();
        await limiter.charge('user', window);

        const first = await limiter.peek('user', window);
        expect(first.resetAt).toBe(start + 1000);
        expect(first.retryAfter).toBe(1000);

        vi.advanceTimersByTime(400);
        const later = await limiter.peek('user', window);
        expect(later.resetAt).toBe(start + 1000);
        expect(later.retryAfter).toBe(600);
    });

    it('reports retryAfter as resetAt minus the call-time now', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { delay: 5000 };
        await limiter.charge('user', window);

        vi.advanceTimersByTime(1234);
        const result = await limiter.peek('user', window);
        expect(result.retryAfter).toBe(result.resetAt - Date.now());
        expect(result.retryAfter).toBe(3766);
    });
});
