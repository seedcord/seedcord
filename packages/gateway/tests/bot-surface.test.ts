import { describe, it, expect } from 'vitest';

import { Seedcord } from '#src/Seedcord';

import { testConfig } from './utils/test-config';

import './utils/mock-env';

describe('the Bot surface a bot author reaches', () => {
    it('drops the calls the host drives', async () => {
        await using seedcord = new Seedcord(testConfig());
        const { bot } = seedcord;

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
