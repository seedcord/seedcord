import { SeedcordErrorCode, isSeedcordError } from '@seedcord/errors';
import { describe, it, expect } from 'vitest';

import { CoordinatedStartup } from '@node/Lifecycle/CoordinatedStartup';
import { StartupPhase } from '@src/lifecycle/phases';

// tested through CoordinatedStartup, which registers no process signal handlers and never calls
// process.exit (CoordinatedShutdown would kill the test process)
describe('CoordinatedStartup events (TypedEventEmitter base)', () => {
    it('emits typed startup and phase events when a phase runs', async () => {
        const startup = new CoordinatedStartup();
        const seen: string[] = [];

        startup.on('startup:start', () => seen.push('startup:start'));
        startup.on('phase:1:start', () => seen.push('phase:1:start'));
        startup.on('startup:complete', () => seen.push('startup:complete'));

        let ran = false;
        startup.addTask(StartupPhase.Configuration, 'noop', () => {
            ran = true;
            return Promise.resolve();
        });

        await startup.run();

        expect(ran).toBe(true);
        expect(seen).toEqual(['startup:start', 'phase:1:start', 'startup:complete']);
        expect(startup.isReady).toBe(true);
    });

    it('a throwing startup:start listener does not abort the run', async () => {
        const startup = new CoordinatedStartup();
        startup.on('startup:start', () => {
            throw new Error('boom');
        });

        let ran = false;
        startup.addTask(StartupPhase.Configuration, 'noop', () => {
            ran = true;
            return Promise.resolve();
        });

        await startup.run();

        expect(ran).toBe(true);
        expect(startup.isReady).toBe(true);
    });

    it('a throwing phase:1:start listener does not abort the run', async () => {
        const startup = new CoordinatedStartup();
        startup.on('phase:1:start', () => {
            throw new Error('boom');
        });

        let ran = false;
        startup.addTask(StartupPhase.Configuration, 'noop', () => {
            ran = true;
            return Promise.resolve();
        });

        await startup.run();

        expect(ran).toBe(true);
        expect(startup.isReady).toBe(true);
    });

    it('inherits waitFor from the TypedEventEmitter base', async () => {
        const startup = new CoordinatedStartup();
        const pending = startup.waitFor('startup:complete');

        startup.addTask(StartupPhase.Configuration, 'noop', () => Promise.resolve());
        await startup.run();

        await expect(pending).resolves.toEqual([]);
    });
});

describe('CoordinatedStartup failure and guards', () => {
    it('emits startup:error and rethrows when a task rejects', async () => {
        const startup = new CoordinatedStartup();
        const boom = new Error('boom');
        let seenError: unknown;
        startup.on('startup:error', (err) => (seenError = err));

        startup.addTask(StartupPhase.Configuration, 'reject', () => Promise.reject(boom));

        await expect(startup.run()).rejects.toThrow();
        expect(seenError).toBeInstanceOf(Error);
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
