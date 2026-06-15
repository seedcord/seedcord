import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { RateLimiter } from '../src/RateLimiter';

describe('RateLimiter', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('reports not limited on the first hit of a fresh key', () => {
        const limiter = new RateLimiter();

        const result = limiter.hit('user', { delay: 1000 });

        expect(result.limited).toBe(false);
    });

    it('limits the second hit inside the window and reports a future expiry', () => {
        const limiter = new RateLimiter();

        const first = limiter.hit('user', { delay: 1000 });
        const second = limiter.hit('user', { delay: 1000 });

        expect(second.limited).toBe(true);
        expect(second.expires).toBe(first.expires);
        expect(second.expires).toBeGreaterThan(Date.now());
    });

    it('allows up to limit hits inside the window before limiting', () => {
        const limiter = new RateLimiter();
        const window = { delay: 1000, limit: 3 };

        expect(limiter.hit('user', window).limited).toBe(false);
        expect(limiter.hit('user', window).limited).toBe(false);
        expect(limiter.hit('user', window).limited).toBe(false);
        expect(limiter.hit('user', window).limited).toBe(true);
    });

    it('frees the key again once the window passes', () => {
        const limiter = new RateLimiter();

        limiter.hit('user', { delay: 1000 });
        expect(limiter.hit('user', { delay: 1000 }).limited).toBe(true);

        vi.advanceTimersByTime(1000);

        expect(limiter.hit('user', { delay: 1000 }).limited).toBe(false);
    });

    it('evicts a fully expired key on the sweep', () => {
        const limiter = new RateLimiter();

        limiter.hit('user', { delay: 1000 });
        expect(limiter.size).toBe(1);

        vi.advanceTimersByTime(60_000);

        expect(limiter.size).toBe(0);
    });

    it('treats a limit below 1 as 1 rather than limiting a fresh key', () => {
        const limiter = new RateLimiter();

        const first = limiter.hit('user', { delay: 1000, limit: 0 });

        expect(first.limited).toBe(false);
        expect(first.expires).toBe(Date.now() + 1000);
        expect(limiter.hit('user', { delay: 1000, limit: 0 }).limited).toBe(true);
    });

    it('keeps a still-live key through the sweep', () => {
        const limiter = new RateLimiter();

        limiter.hit('user', { delay: 120_000 });

        vi.advanceTimersByTime(60_000);

        expect(limiter.size).toBe(1);
    });
});
