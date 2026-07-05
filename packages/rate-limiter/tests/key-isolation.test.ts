import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { buildKey } from '../src/buildKey';
import { MemoryRateLimiter } from '../src/MemoryRateLimiter';

describe('MemoryRateLimiter key isolation', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('limits one key without affecting a different key', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 1000 };

        await limiter.charge('a', window);
        expect(await limiter.charge('a', window)).toMatchObject({ limited: true });
        expect(await limiter.charge('b', window)).toMatchObject({ limited: false });
    });

    it('tracks one entry per distinct key', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 1000 };

        await limiter.charge('a', window);
        await limiter.charge('b', window);
        await limiter.charge('c', window);

        expect(limiter.size).toBe(3);
    });

    it('collides only when buildKey composes the same scope', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 1000 };

        await limiter.charge(buildKey('cooldown', '111'), window);
        expect(await limiter.charge(buildKey('cooldown', '111'), window)).toMatchObject({ limited: true });
        expect(await limiter.charge(buildKey('cooldown', '222'), window)).toMatchObject({ limited: false });
    });

    it('resets one key and leaves the others intact', async () => {
        const limiter = new MemoryRateLimiter();
        const window = { windowMs: 1000 };
        await limiter.charge('a', window);
        await limiter.charge('b', window);

        await limiter.reset('a');

        expect(await limiter.charge('a', window)).toMatchObject({ limited: false });
        expect(await limiter.peek('b', window)).toMatchObject({ limited: true });
    });

    it('resolves reset of an unknown key without error', async () => {
        const limiter = new MemoryRateLimiter();

        await expect(limiter.reset('never-charged')).resolves.toBeUndefined();
    });
});
