import { describe, it, expect } from 'vitest';

import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';

// run() would exit the test process
describe('CoordinatedShutdown signal handlers', () => {
    it('registers handlers on request and releases them', () => {
        const sigtermBase = process.listenerCount('SIGTERM');
        const sigintBase = process.listenerCount('SIGINT');
        const shutdown = new CoordinatedShutdown();

        shutdown.registerSignalHandlers();
        expect(process.listenerCount('SIGTERM')).toBe(sigtermBase + 1);
        expect(process.listenerCount('SIGINT')).toBe(sigintBase + 1);

        shutdown.removeSignalHandlers();
        expect(process.listenerCount('SIGTERM')).toBe(sigtermBase);
        expect(process.listenerCount('SIGINT')).toBe(sigintBase);
    });

    it('registers one pair however often it is asked', () => {
        const sigtermBase = process.listenerCount('SIGTERM');
        const sigintBase = process.listenerCount('SIGINT');
        const shutdown = new CoordinatedShutdown();

        shutdown.registerSignalHandlers();
        shutdown.registerSignalHandlers();

        expect(process.listenerCount('SIGTERM')).toBe(sigtermBase + 1);
        expect(process.listenerCount('SIGINT')).toBe(sigintBase + 1);
        shutdown.removeSignalHandlers();
    });

    it('release is idempotent', () => {
        const sigtermBase = process.listenerCount('SIGTERM');
        const sigintBase = process.listenerCount('SIGINT');
        const shutdown = new CoordinatedShutdown();
        shutdown.registerSignalHandlers();

        shutdown.removeSignalHandlers();
        shutdown.removeSignalHandlers();

        expect(process.listenerCount('SIGTERM')).toBe(sigtermBase);
        expect(process.listenerCount('SIGINT')).toBe(sigintBase);
    });
});
