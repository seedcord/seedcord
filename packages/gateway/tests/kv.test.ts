import { MemoryDriver } from '@seedcord/core';
import { describe, it, expect } from 'vitest';

import { Seedcord } from '#src/Seedcord';

import { testConfig } from './utils/test-config';

describe('config.kv', () => {
    it('backs core.kv with the passed driver', async () => {
        const driver = new MemoryDriver();
        await using bot = new Seedcord({ ...testConfig(), kv: driver });

        expect(bot.kv.driver).toBe(driver);
    });
});
