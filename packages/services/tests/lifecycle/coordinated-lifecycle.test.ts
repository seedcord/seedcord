import { describe, it, expect } from 'vitest';

import { CoordinatedStartup, StartupPhase } from '../../src/Lifecycle/CoordinatedStartup';

// CoordinatedStartup is the safe lifecycle to exercise: unlike CoordinatedShutdown it neither
// registers process signal handlers nor calls process.exit. These assert that M19's move onto
// StrictEventEmitter still emits the typed start/phase/complete events and inherits waitFor.
describe('CoordinatedStartup events (StrictEventEmitter base)', () => {
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

    it('inherits waitFor from the StrictEventEmitter base', async () => {
        const startup = new CoordinatedStartup();
        const pending = startup.waitFor('startup:complete');

        startup.addTask(StartupPhase.Validation, 'noop', () => Promise.resolve());
        await startup.run();

        await expect(pending).resolves.toEqual([]);
    });
});
