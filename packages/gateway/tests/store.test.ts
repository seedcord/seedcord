import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { describe, it, expect } from 'vitest';

import { Seedcord } from '#src/Seedcord';

import { testConfig } from './utils/test-config';

import './utils/mock-env';

describe('config.store', () => {
    it('backs core.rateLimiter with the provided store', async () => {
        const store = new MemoryRateLimiter();
        await using bot = new Seedcord({ ...testConfig(), store });
        expect(bot.rateLimiter).toBe(store);
    });

    it('falls back to an in-memory store when none is given', async () => {
        await using bot = new Seedcord(testConfig());
        expect(bot.rateLimiter).toBeInstanceOf(MemoryRateLimiter);
    });
});
