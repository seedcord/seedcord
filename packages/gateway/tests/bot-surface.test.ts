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

        const hidden = [
            'init',
            'stop',
            'logout',
            'login',
            'drain',
            'stopAccepting',
            'registerShutdownTasks',
            'interactions',
            'events',
            'commandRegistry'
        ];
        for (const name of hidden) {
            expect(name in bot).toBe(false);
        }
        expect(bot.client).toBeDefined();
    });
});
