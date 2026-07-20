import { ShutdownPhase } from '@seedcord/core/node/internal';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { Seedcord } from '@src/Seedcord';

import { testConfig } from './utils/test-config';

import './utils/mock-client';
import './utils/mock-env';

function reset(): void {
    // @ts-expect-error reset the Seedcord singleton between tests
    Seedcord.reset();
}

describe('Seedcord host', () => {
    beforeEach(reset);
    afterEach(reset);

    it('reset() releases the signal handlers', () => {
        const base = process.listenerCount('SIGTERM');

        // eslint-disable-next-line no-new -- construction registers the handlers under test
        new Seedcord(testConfig());
        expect(process.listenerCount('SIGTERM')).toBe(base + 1);

        reset();
        expect(process.listenerCount('SIGTERM')).toBe(base);
    });

    it('registers the health server by default', () => {
        const seedcord = new Seedcord(testConfig());

        expect(seedcord.shutdown.removeTask(ShutdownPhase.StopServices, 'stop-healthcheck-server')).toBe(true);
    });

    it('healthCheck: false skips the health server', () => {
        const seedcord = new Seedcord(testConfig({ healthCheck: false }));

        expect(seedcord.shutdown.removeTask(ShutdownPhase.StopServices, 'stop-healthcheck-server')).toBe(false);
    });
});
