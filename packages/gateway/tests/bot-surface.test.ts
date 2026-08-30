import { describe, it, expect, afterEach } from 'vitest';

import { Seedcord } from '#src/Seedcord';

import { testConfig } from './utils/test-config';

import './utils/mock-env';

describe('the Bot surface a bot author reaches', () => {
    afterEach(() => {
        // @ts-expect-error reset the Seedcord singleton between tests
        Seedcord.reset();
    });

    it('drops the calls the host drives', () => {
        const { bot } = new Seedcord(testConfig());

        for (const name of ['init', 'stop', 'logout', 'drain', 'stopAccepting', 'registerShutdownTasks']) {
            expect(name in bot).toBe(false);
        }
        expect(bot.client).toBeDefined();
    });
});
