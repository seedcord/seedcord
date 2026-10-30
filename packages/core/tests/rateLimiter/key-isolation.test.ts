import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { buildKey } from '#src/rateLimiter/buildKey';
import { memoryRateLimiter } from '#tests/utils/memoryRateLimiter';

describe('KvRateLimiter key isolation', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('limits one key without affecting a different key', async () => {
        const limiter = memoryRateLimiter();
        const window = { windowMs: 1000 };

        await limiter.charge('a', window);
        expect(await limiter.charge('a', window)).toMatchObject({ limited: true });
        expect(await limiter.charge('b', window)).toMatchObject({ limited: false });
    });

    it('collides only when buildKey composes the same scope', async () => {
        const limiter = memoryRateLimiter();
        const window = { windowMs: 1000 };

        await limiter.charge(buildKey('cooldown', '111'), window);
        expect(await limiter.charge(buildKey('cooldown', '111'), window)).toMatchObject({ limited: true });
        expect(await limiter.charge(buildKey('cooldown', '222'), window)).toMatchObject({ limited: false });
    });

    it('resets one key and leaves the others intact', async () => {
        const limiter = memoryRateLimiter();
        const window = { windowMs: 1000 };
        await limiter.charge('a', window);
        await limiter.charge('b', window);

        await limiter.reset('a');

        expect(await limiter.charge('a', window)).toMatchObject({ limited: false });
        expect(await limiter.peek('b', window)).toMatchObject({ limited: true });
    });
});
