import { describe, expect, it } from 'vitest';

import { MemoryDriver } from '#src/kv/MemoryDriver';
import { TestPluginHost } from '#tests/utils/TestPluginHost';

describe('the host kv', () => {
    it('keeps handler records and rate limits under their own prefixes', async () => {
        const driver = new MemoryDriver();
        const host = new TestPluginHost('gateway', 'server', driver);

        await host.kv.collection<number>('count').set('a', 1);
        await host.rateLimiter.charge('user', { windowMs: 60_000 });

        const entries = await Array.fromAsync(driver.entries(''));
        expect(entries.map(([key]) => key).toSorted()).toEqual(['app:count:a', 'seedcord:rate-limit:user']);
    });

    it('falls back to a MemoryDriver', () => {
        expect(new TestPluginHost().kv.driver).toBeInstanceOf(MemoryDriver);
    });
});
