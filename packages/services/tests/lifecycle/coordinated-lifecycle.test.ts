import { describe, it, expect } from 'vitest';

import { CoordinatedStartup, StartupPhase } from '../../src/Lifecycle/CoordinatedStartup';

// tested through CoordinatedStartup, which registers no process signal handlers and never calls
// process.exit. these assert the TypedEventEmitter base still emits the typed start/phase/complete
// events and inherits waitFor.
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

    it('inherits waitFor from the TypedEventEmitter base', async () => {
        const startup = new CoordinatedStartup();
        const pending = startup.waitFor('startup:complete');

        startup.addTask(StartupPhase.Validation, 'noop', () => Promise.resolve());
        await startup.run();

        await expect(pending).resolves.toEqual([]);
    });
});
