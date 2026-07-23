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
        startup.addTask(StartupPhase.Validation, 'noop', () => {
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
        startup.addTask(StartupPhase.Validation, 'noop', () => {
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
        startup.addTask(StartupPhase.Validation, 'noop', () => {
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

        startup.addTask(StartupPhase.Validation, 'noop', () => Promise.resolve());
        await startup.run();

        await expect(pending).resolves.toEqual([]);
    });
});
