import { describe, expect, it } from 'vitest';

import { noticesOf } from '@ui/notices';
import { DevStore } from '@ui/stores/DevStore';

import type { DevState } from '@ui/stores/DevStore';

function running(): DevStore {
    const store = new DevStore();
    store.setPhase('running');
    store.setBusy(false);
    return store;
}

const keysOf = (state: DevState): string[] => noticesOf(state).map((notice) => notice.key);

describe('noticesOf', () => {
    it('reports nothing while the session is clean', () => {
        expect(noticesOf(running().getState())).toHaveLength(0);
    });

    it('words the command prompt with its count and its keys', () => {
        const store = running();
        store.apply({ type: 'command-update-prompt', files: ['a.ts', 'b.ts', 'c.ts', 'd.ts'] });

        expect(noticesOf(store.getState())[0]?.summary).toBe('4 commands updated');
    });

    it('singularises a one-file prompt', () => {
        const store = running();
        store.apply({ type: 'command-update-prompt', files: ['a.ts'] });

        expect(noticesOf(store.getState())[0]?.summary).toBe('1 command updated');
    });

    it('ranks the prompt above an error', () => {
        const store = running();
        store.setError(new Error('boom'));
        store.apply({ type: 'command-update-prompt', files: ['a.ts'] });

        expect(keysOf(store.getState())).toStrictEqual(['commands', 'error']);
    });

    // the runner sets the phase and the notice together, so filtering on the phase drops the card entirely
    it('keeps the error notice while the phase reads error', () => {
        const store = running();
        store.setPhase('error');
        store.setError(new Error('boom'));

        expect(keysOf(store.getState())).toStrictEqual(['error']);
    });

    it('keeps the restart notice while the phase reads restart-required', () => {
        const store = running();
        store.apply({ type: 'restart-required' });

        expect(keysOf(store.getState())).toStrictEqual(['restart']);
    });

    it('names the key each notice answers to', () => {
        const store = running();
        store.setError(new Error('boom'));
        store.apply({ type: 'restart-required' });
        store.apply({ type: 'command-update-prompt', files: ['a.ts'] });

        expect(noticesOf(store.getState()).map((notice) => notice.action)).toStrictEqual([
            'refresh? y/n',
            'press r to restart',
            'press r to restart'
        ]);
    });

    it('summarises an error with its message alone', () => {
        const store = running();
        store.setError(new Error('connect ECONNREFUSED 127.0.0.1:27017'));

        expect(noticesOf(store.getState())[0]?.summary).toBe('connect ECONNREFUSED 127.0.0.1:27017');
    });

    it('leaves the restart summary empty', () => {
        const store = running();
        store.apply({ type: 'restart-required' });

        expect(noticesOf(store.getState())[0]?.summary).toBe('');
    });
});
