import { describe, it, expect, vi } from 'vitest';

import { DevStore } from '#ui/stores/DevStore';

import type { DevEvent } from '#commands/dev/runtime/events';

describe('DevStore', () => {
    it('starts in the initial state', () => {
        const state = new DevStore().getState();
        expect(state).toMatchObject({
            phase: 'starting',
            isBusy: true,
            error: null,
            restartRequired: false,
            commandUpdatePrompt: null
        });
    });

    it('scalar setters patch their field and emit one change each', () => {
        const store = new DevStore();
        const onChange = vi.fn();
        store.on('change', onChange);

        store.setStatus('running');
        store.setBusy(false);
        store.setPhase('running');
        store.setError(new Error('boom'));
        store.setFrameworkVersion('1.2.3');
        store.setTunnel('live');

        const state = store.getState();
        expect(state.status).toBe('running');
        expect(state.isBusy).toBe(false);
        expect(state.phase).toBe('running');
        expect(state.error).toBeInstanceOf(Error);
        expect(state.frameworkVersion).toBe('1.2.3');
        expect(state.tunnel).toBe('live');
        expect(onChange).toHaveBeenCalledTimes(6);
    });

    it('getState returns a stable reference until the next mutation', () => {
        const store = new DevStore();
        const first = store.getState();
        expect(store.getState()).toBe(first);

        store.setBusy(false);
        expect(store.getState()).not.toBe(first);
    });

    it('beginRestart applies an atomic reconnecting patch in a single change', () => {
        const store = new DevStore();
        store.setError(new Error('boom'));
        const onChange = vi.fn();
        store.on('change', onChange);

        store.beginRestart();

        expect(store.getState()).toMatchObject({
            phase: 'starting',
            isBusy: true,
            restartRequired: false,
            error: null,
            status: 'Restarting…'
        });
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('beginDisconnect applies an atomic disconnect patch in a single change', () => {
        const store = new DevStore();
        const onChange = vi.fn();
        store.on('change', onChange);

        store.beginDisconnect();

        expect(store.getState()).toMatchObject({
            phase: 'disconnected',
            isBusy: true,
            restartRequired: false,
            error: null,
            status: 'Disconnecting…'
        });
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('beginQuit applies an atomic quitting patch in a single change', () => {
        const store = new DevStore();
        const onChange = vi.fn();
        store.on('change', onChange);

        store.beginQuit();

        expect(store.getState()).toMatchObject({ phase: 'quitting', isBusy: true, status: 'Shutting down…' });
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it('apply reduces restart-required into restart state', () => {
        const store = new DevStore();
        store.apply({ type: 'restart-required' });

        expect(store.getState()).toMatchObject({ phase: 'restart-required', restartRequired: true });
    });

    it('apply reduces command-update-prompt into the prompt files', () => {
        const store = new DevStore();
        const files = ['a.ts', 'b.ts'];
        store.apply({ type: 'command-update-prompt', files });

        expect(store.getState().commandUpdatePrompt).toEqual(files);
    });

    it.each(['beginRestart', 'beginDisconnect'] as const)('%s drops the port of the run that ended', (method) => {
        const store = new DevStore();
        store.apply({ type: 'server-listening', port: 4321 });

        store[method]();

        expect(store.getState().port).toBeNull();
    });

    it('apply reduces server-listening into the bound port', () => {
        const store = new DevStore();
        store.apply({ type: 'server-listening', port: 4000 });

        expect(store.getState().port).toBe(4000);
    });

    it('clearPrompt drops the pending prompt with one change', () => {
        const store = new DevStore();
        store.apply({ type: 'command-update-prompt', files: ['a.ts'] });
        const onChange = vi.fn();
        store.on('change', onChange);

        store.clearPrompt();

        expect(store.getState().commandUpdatePrompt).toBeNull();
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it.each<DevEvent>([
        { type: 'module-loading', path: 'x' },
        { type: 'module-loaded', path: 'x' },
        { type: 'module-error', path: 'x', error: new Error('e') },
        { type: 'file-change', path: 'x' },
        { type: 'ready' }
    ])('apply ignores informational event %o without a change', (event) => {
        const store = new DevStore();
        const before = store.getState();
        const onChange = vi.fn();
        store.on('change', onChange);

        store.apply(event);

        expect(store.getState()).toBe(before);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('apply throws on an unknown event type (exhaustiveness guard)', () => {
        const store = new DevStore();
        // exhaustiveness is compile-checked via assertNever; this proves the runtime guard too.
        expect(() => store.apply({ type: 'nope' } as unknown as DevEvent)).toThrow();
    });
});
