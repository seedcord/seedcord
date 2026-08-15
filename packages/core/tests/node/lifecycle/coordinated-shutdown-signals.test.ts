import { describe, it, expect } from 'vitest';

import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';

// construction only, never run(), which would exit the test process
describe('CoordinatedShutdown signal handlers', () => {
    it('registers handlers at construction and releases them', () => {
        const sigtermBase = process.listenerCount('SIGTERM');
        const sigintBase = process.listenerCount('SIGINT');
        const shutdown = new CoordinatedShutdown();

        expect(process.listenerCount('SIGTERM')).toBe(sigtermBase + 1);
        expect(process.listenerCount('SIGINT')).toBe(sigintBase + 1);

        shutdown.removeSignalHandlers();
        expect(process.listenerCount('SIGTERM')).toBe(sigtermBase);
        expect(process.listenerCount('SIGINT')).toBe(sigintBase);
    });

    it('release is idempotent', () => {
        const sigtermBase = process.listenerCount('SIGTERM');
        const sigintBase = process.listenerCount('SIGINT');
        const shutdown = new CoordinatedShutdown();

        shutdown.removeSignalHandlers();
        shutdown.removeSignalHandlers();

        expect(process.listenerCount('SIGTERM')).toBe(sigtermBase);
        expect(process.listenerCount('SIGINT')).toBe(sigintBase);
    });
});
