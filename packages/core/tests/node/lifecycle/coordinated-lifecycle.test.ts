import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { describe, it, expect } from 'vitest';

import { CoordinatedStartup } from '@node/Lifecycle/CoordinatedStartup';
import { StartupPhase } from '@src/lifecycle/phases';

// the base runs through CoordinatedStartup here, CoordinatedShutdown's signal handlers and
// process.exit would kill the test run
describe('CoordinatedStartup run', () => {
    it('runs a registered task and reports ready', async () => {
        const startup = new CoordinatedStartup();

        let ran = false;
        startup.addTask(StartupPhase.Configuration, 'noop', () => {
            ran = true;
            return Promise.resolve();
        });

        await startup.run();

        expect(ran).toBe(true);
        expect(startup.isReady).toBe(true);
    });
});

describe('CoordinatedStartup failure and guards', () => {
    it('rethrows and stays unready when a task rejects', async () => {
        const startup = new CoordinatedStartup();

        startup.addTask(StartupPhase.Configuration, 'reject', () => Promise.reject(new Error('boom')));

        await expect(startup.run()).rejects.toThrow();
        expect(startup.isReady).toBe(false);
    });

    it('rejects addTask after startup completed', async () => {
        const startup = new CoordinatedStartup();
        startup.addTask(StartupPhase.Configuration, 'noop', () => Promise.resolve());
        await startup.run();

        try {
            startup.addTask(StartupPhase.Configuration, 'late', () => Promise.resolve());
            expect.fail('expected a throw');
        } catch (err) {
            expect(isSeedcordError(err, undefined, SeedcordErrorCode.LifecycleAddAfterCompletion)).toBe(true);
        }
    });

    it('rejects addTask while a run is in progress', async () => {
        const startup = new CoordinatedStartup();
        let caught: unknown;
        startup.addTask(StartupPhase.Configuration, 'racer', () => {
            try {
                startup.addTask(StartupPhase.Ready, 'during', () => Promise.resolve());
            } catch (err) {
                caught = err;
            }
            return Promise.resolve();
        });

        await startup.run();
        expect(isSeedcordError(caught, undefined, SeedcordErrorCode.LifecycleAddDuringRun)).toBe(true);
    });

    it('times out a never-resolving task', async () => {
        const startup = new CoordinatedStartup();
        startup.addTask(StartupPhase.Configuration, 'hang', () => new Promise<void>(() => undefined), 10);

        await expect(startup.run()).rejects.toThrow();
    });

    it('abort() inside a task stops later phases and keeps isReady false', async () => {
        const startup = new CoordinatedStartup();
        let readyRan = false;

        startup.addTask(StartupPhase.Configuration, 'aborter', () => {
            startup.abort();
            return Promise.resolve();
        });
        startup.addTask(StartupPhase.Ready, 'later', () => {
            readyRan = true;
            return Promise.resolve();
        });

        await startup.run();

        expect(startup.isReady).toBe(false);
        expect(readyRan).toBe(false);
    });
});
