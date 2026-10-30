import { describe, expect, it } from 'vitest';

import { MemoryDriver } from '#src/kv/MemoryDriver';
import { openKv } from '#src/kv/openKv';

describe('openKv', () => {
    it('keeps handler records and rate limits under their own prefixes', async () => {
        const driver = new MemoryDriver();
        const { kv, rateLimiter } = openKv(driver);

        await kv.collection<number>('count').set('a', 1);
        await rateLimiter.charge('user', { windowMs: 60_000 });

        const keys = await driver.keys('');
        expect(keys.toSorted()).toEqual(['app:count:a', 'seedcord:rate-limit:user']);
    });

    it('falls back to a MemoryDriver', () => {
        expect(openKv(undefined).kv.driver).toBeInstanceOf(MemoryDriver);
    });
});
