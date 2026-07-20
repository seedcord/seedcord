import { describe, it, expect } from 'vitest';

import { CoordinatedShutdown } from '@node/Lifecycle/CoordinatedShutdown';

// construction only, never run(), which would exit the test process
describe('CoordinatedShutdown signal handlers', () => {
    it('registers handlers at construction and releases them', () => {
        const base = process.listenerCount('SIGTERM');
        const shutdown = new CoordinatedShutdown();

        expect(process.listenerCount('SIGTERM')).toBe(base + 1);

        shutdown.removeSignalHandlers();
        expect(process.listenerCount('SIGTERM')).toBe(base);
        expect(process.listenerCount('SIGINT')).toBeLessThanOrEqual(base + 1);
    });

    it('release is idempotent', () => {
        const base = process.listenerCount('SIGTERM');
        const shutdown = new CoordinatedShutdown();

        shutdown.removeSignalHandlers();
        shutdown.removeSignalHandlers();

        expect(process.listenerCount('SIGTERM')).toBe(base);
    });
});
