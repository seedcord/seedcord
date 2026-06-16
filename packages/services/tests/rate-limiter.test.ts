import { describe, it, expect, expectTypeOf, vi, beforeEach, afterEach } from 'vitest';

import { RateLimiter } from '../src/RateLimiter';

import type { EpochMs } from '@seedcord/types';

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

    it('peek reports the limited state without recording a hit', () => {
        const limiter = new RateLimiter();

        expect(limiter.peek('user', { delay: 1000 }).limited).toBe(false);
        expect(limiter.size).toBe(0);

        // peek consumed nothing, so a real hit still sees a fresh key
        expect(limiter.hit('user', { delay: 1000 }).limited).toBe(false);
    });

    it('peek reports limited with the soonest expiry but still records nothing', () => {
        const limiter = new RateLimiter();
        const recorded = limiter.hit('user', { delay: 1000 });

        const peeked = limiter.peek('user', { delay: 1000 });

        expect(peeked.limited).toBe(true);
        expect(peeked.expires).toBe(recorded.expires);
        // peeking a limited key adds no hit, so it never compounds the window
        expect(limiter.peek('user', { delay: 1000 }).limited).toBe(true);
        expect(limiter.size).toBe(1);
    });

    it('brands expires as epoch ms, distinct from a plain number', () => {
        const result = new RateLimiter().hit('user', { delay: 1000 });

        expectTypeOf(result.expires).toEqualTypeOf<EpochMs>();

        // @ts-expect-error a plain number is not branded epoch ms
        const ms: EpochMs = 5;
        expect(ms).toBe(5);

        // EpochMs stays usable as a number for arithmetic
        expect(typeof Math.round(result.expires / 1000)).toBe('number');
    });
});
