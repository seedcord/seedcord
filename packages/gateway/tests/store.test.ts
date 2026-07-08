import { MemoryRateLimiter } from '@seedcord/rate-limiter';
import { describe, it, expect, beforeEach } from 'vitest';

import { Seedcord } from '@src/Seedcord';

import { testConfig } from './utils/test-config';

import './utils/mock-client';
import './utils/mock-env';

describe('config.store', () => {
    beforeEach(() => {
        // @ts-expect-error reset the Seedcord singleton between tests
        Seedcord.reset();
    });

    it('backs core.rateLimiter with the provided store', () => {
        const store = new MemoryRateLimiter();
        const bot = new Seedcord({ ...testConfig(), store });
        expect(bot.rateLimiter).toBe(store);
    });

    it('falls back to an in-memory store when none is given', () => {
        const bot = new Seedcord(testConfig());
        expect(bot.rateLimiter).toBeInstanceOf(MemoryRateLimiter);
    });
});
