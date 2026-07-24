import { describe, it, expect, vi } from 'vitest';

import { CoordinatedShutdown } from '@node/Lifecycle/CoordinatedShutdown';
import { ShutdownPhase } from '@src/lifecycle/phases';

// run(_, false) leaves the process alive (dev mode). A second call must not re-run tasks that
// already ran on the first, even when the first failed inside a phase.
describe('CoordinatedShutdown.run re-entrancy', () => {
    it('does not re-run tasks after a failed dev-mode shutdown', async () => {
        const shutdown = new CoordinatedShutdown();
        shutdown.removeSignalHandlers();

        // survivor runs in the same phase as the rejector, so allSettled runs it before the phase
        // throws. a re-entrant run would run it a second time.
        const survivor = vi.fn(() => Promise.resolve());
        shutdown.addTask(ShutdownPhase.Unbind, 'reject', () => Promise.reject(new Error('boom')), 1000);
        shutdown.addTask(ShutdownPhase.Unbind, 'survivor', survivor, 1000);

        await shutdown.run(1, false);
        await shutdown.run(1, false);

        expect(survivor).toHaveBeenCalledTimes(1);
    });

    it('does not re-run tasks after a successful dev-mode shutdown', async () => {
        const shutdown = new CoordinatedShutdown();
        shutdown.removeSignalHandlers();

        const task = vi.fn(() => Promise.resolve());
        shutdown.addTask(ShutdownPhase.Unbind, 'task', task, 1000);

        await shutdown.run(0, false);
        await shutdown.run(0, false);

        expect(task).toHaveBeenCalledTimes(1);
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

        let errored = false;
        shutdown.on('shutdown:error', () => (errored = true));

        await expect(shutdown.run(0, false)).resolves.toBeUndefined();

        expect(disconnect).toHaveBeenCalledTimes(1);
        expect(logout).toHaveBeenCalledTimes(1);
        expect(errored).toBe(true);
    });

    it('emits an AggregateError carrying every phase failure', async () => {
        const shutdown = new CoordinatedShutdown();
        shutdown.removeSignalHandlers();

        shutdown.addTask(ShutdownPhase.Drain, 'drain-fail', () => Promise.reject(new Error('drain-boom')), 1000);
        shutdown.addTask(
            ShutdownPhase.Disconnect,
            'disconnect-fail',
            () => Promise.reject(new Error('disconnect-boom')),
            1000
        );

        let payload: unknown;
        shutdown.on('shutdown:error', (error) => (payload = error));

        await shutdown.run(0, false);

        expect(payload).toBeInstanceOf(AggregateError);
        const inner = (payload as AggregateError).errors;
        expect(inner).toHaveLength(2);
        const messages = inner.map((e) => (e as Error).message);
        expect(messages.some((m) => m.includes('Drain'))).toBe(true);
        expect(messages.some((m) => m.includes('Disconnect'))).toBe(true);
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
