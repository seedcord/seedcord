import { Logger } from '@seedcord/logger';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import { ShutdownPhase } from '#src/lifecycle/phases';

// a second spyOn on an already-spied method returns the existing mock, so an unrestored spy
// carries the previous test's calls into this one
afterEach(() => {
    vi.restoreAllMocks();
});

function failureReport(errors: { mock: { calls: unknown[][] } }): string {
    const call = errors.mock.calls.find(([msg]) => String(msg).includes('Coordinated shutdown failed'));
    return call ? call.slice(1).map(String).join('\n') : '<no shutdown-failed log>';
}

// run(_, false) leaves the process alive (dev mode)
describe('CoordinatedShutdown.run re-entrancy', () => {
    it('does not re-run tasks after a failed dev-mode shutdown', async () => {
        const shutdown = new CoordinatedShutdown();
        shutdown.removeSignalHandlers();

        // same phase as the rejector, so allSettled still runs survivor before the phase throws
        const survivor = vi.fn(() => Promise.resolve());
        shutdown.addTask(ShutdownPhase.Unbind, 'reject', () => Promise.reject(new Error('boom')), 1000);
        shutdown.addTask(ShutdownPhase.Unbind, 'survivor', survivor, 1000);

        await shutdown.run(1, false);
        await shutdown.run(1, false);

        expect(survivor).toHaveBeenCalledTimes(1);
    });
});

describe('CoordinatedShutdown.run phase resilience', () => {
    it('runs later phases even when an earlier phase fails', async () => {
        const shutdown = new CoordinatedShutdown();
        shutdown.removeSignalHandlers();

        const disconnect = vi.fn(() => Promise.resolve());
        const logout = vi.fn(() => Promise.resolve());
        shutdown.addTask(ShutdownPhase.Drain, 'reject', () => Promise.reject(new Error('boom')), 1000);
        shutdown.addTask(ShutdownPhase.Disconnect, 'disconnect', disconnect, 1000);
        shutdown.addTask(ShutdownPhase.Logout, 'logout', logout, 1000);

        const errors = vi.spyOn(Logger.prototype, 'error');

        await expect(shutdown.run(0, false)).resolves.toBeUndefined();

        expect(disconnect).toHaveBeenCalledTimes(1);
        expect(logout).toHaveBeenCalledTimes(1);
        expect(failureReport(errors)).toContain('Drain');
    });

    it('reports every phase failure on the shutdown-failed log line', async () => {
        const shutdown = new CoordinatedShutdown();
        shutdown.removeSignalHandlers();
        const errors = vi.spyOn(Logger.prototype, 'error');

        shutdown.addTask(ShutdownPhase.Drain, 'drain-fail', () => Promise.reject(new Error('drain-boom')), 1000);
        shutdown.addTask(
            ShutdownPhase.Disconnect,
            'disconnect-fail',
            () => Promise.reject(new Error('disconnect-boom')),
            1000
        );

        await shutdown.run(0, false);

        const reported = failureReport(errors);
        expect(reported).toContain('Drain');
        expect(reported).toContain('Disconnect');
    });
});

describe('CoordinatedShutdown.run startup gate', () => {
    it('waits for the startup gate before running its phases', async () => {
        const shutdown = new CoordinatedShutdown();
        shutdown.removeSignalHandlers();

        const gate: PromiseWithResolvers<void> = Promise.withResolvers();
        shutdown.gateOnStartup(gate.promise);

        let done = false;
        const run = shutdown.run(0, false).then(() => {
            done = true;
        });
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
        expect(done).toBe(false);

        gate.resolve();
        await run;
        expect(done).toBe(true);
    });
});
