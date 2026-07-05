import { describe, it, expect, expectTypeOf, vi, beforeEach, afterEach } from 'vitest';

import { MemoryRateLimiter } from '../src/MemoryRateLimiter';

import type { EpochMs, IRateLimiter } from '@seedcord/types';

describe('MemoryRateLimiter', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('satisfies IRateLimiter', () => {
        expectTypeOf(new MemoryRateLimiter()).toExtend<IRateLimiter>();
    });

    it('reports not limited on the first charge of a fresh key', async () => {
        const limiter = new MemoryRateLimiter();

        const result = await limiter.charge('user', { windowMs: 1000 });

        expect(result.limited).toBe(false);
        expect(result.resetAt).toBe(0);
        expect(result.retryAfterMs).toBe(0);
        expect(result.remaining).toBe(0);
    });

    it('limits the second charge inside the window and reports when the slot frees', async () => {
        const limiter = new MemoryRateLimiter();

        await limiter.charge('user', { windowMs: 1000 });
        const second = await limiter.charge('user', { windowMs: 1000 });

        expect(second.limited).toBe(true);
        expect(second.resetAt).toBe(Date.now() + 1000);
        expect(second.retryAfterMs).toBe(1000);
        expect(second.remaining).toBe(0);
    });

    it('allows up to limit charges inside the window and counts remaining down', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 1000, limit: 3 };

        expect(await limiter.charge('user', window)).toMatchObject({ limited: false, remaining: 2 });
        expect(await limiter.charge('user', window)).toMatchObject({ limited: false, remaining: 1 });
        expect(await limiter.charge('user', window)).toMatchObject({ limited: false, remaining: 0 });
        expect(await limiter.charge('user', window)).toMatchObject({ limited: true, remaining: 0 });
    });

    it('frees the key again once the window passes', async () => {
        const limiter = new MemoryRateLimiter();

        await limiter.charge('user', { windowMs: 1000 });
        const blocked = await limiter.charge('user', { windowMs: 1000 });
        expect(blocked.limited).toBe(true);

        vi.advanceTimersByTime(1000);

        const freed = await limiter.charge('user', { windowMs: 1000 });
        expect(freed.limited).toBe(false);
    });

    it('treats a limit below 1 as 1', async () => {
        const limiter = new MemoryRateLimiter();

        const first = await limiter.charge('user', { windowMs: 1000, limit: 0 });
        const second = await limiter.charge('user', { windowMs: 1000, limit: 0 });
        expect(first.limited).toBe(false);
        expect(second.limited).toBe(true);
    });

    it('evicts a fully expired key on the first access after the sweep gap, with no timer', async () => {
        const limiter = new MemoryRateLimiter();

        await limiter.charge('user', { windowMs: 1000 });
        expect(limiter.size).toBe(1);

        // setSystemTime moves the clock without firing any timer, so eviction must come from access alone
        vi.setSystemTime(Date.now() + 60_001);
        await limiter.peek('other', { windowMs: 1000 });

        expect(limiter.size).toBe(0);
    });

    it('keeps a still-live key through the sweep', async () => {
        const limiter = new MemoryRateLimiter();

        await limiter.charge('user', { windowMs: 120_000 });

        vi.setSystemTime(Date.now() + 60_001);
        await limiter.peek('other', { windowMs: 1000 });

        expect(limiter.size).toBe(1);
    });

    it('keeps an expired key when the access lands inside the sweep gap', async () => {
        const limiter = new MemoryRateLimiter();

        await limiter.charge('user', { windowMs: 1000 });

        vi.setSystemTime(Date.now() + 59_999);
        await limiter.peek('other', { windowMs: 1000 });

        expect(limiter.size).toBe(1);
    });

    it('peek reports a fresh key as open without recording a use', async () => {
        const limiter = new MemoryRateLimiter();

        const peeked = await limiter.peek('user', { windowMs: 1000, limit: 3 });

        expect(peeked).toMatchObject({ limited: false, remaining: 3, resetAt: 0, retryAfterMs: 0 });
        expect(limiter.size).toBe(0);
    });

    it('peek reports limited with the soonest reset but still records nothing', async () => {
        const limiter = new MemoryRateLimiter();
        await limiter.charge('user', { windowMs: 1000 });

        const peeked = await limiter.peek('user', { windowMs: 1000 });

        expect(peeked.limited).toBe(true);
        expect(peeked.resetAt).toBe(Date.now() + 1000);
        // peeking a limited key adds no use, so it never compounds the window
        const peekedAgain = await limiter.peek('user', { windowMs: 1000 });
        expect(peekedAgain.limited).toBe(true);
        expect(limiter.size).toBe(1);
    });

    it('reset clears the key so the next charge starts a fresh window', async () => {
        const limiter = new MemoryRateLimiter();

        await limiter.charge('user', { windowMs: 1000 });
        const before = await limiter.peek('user', { windowMs: 1000 });
        expect(before.limited).toBe(true);

        await limiter.reset('user');

        expect(limiter.size).toBe(0);
        const after = await limiter.charge('user', { windowMs: 1000 });
        expect(after.limited).toBe(false);
    });

    it('brands resetAt as epoch ms', async () => {
        const result = await new MemoryRateLimiter().charge('user', { windowMs: 1000 });

        expectTypeOf(result.resetAt).toEqualTypeOf<EpochMs>();
    });
});
