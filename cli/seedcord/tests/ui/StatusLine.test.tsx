import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { StatusLine } from '#ui/components/primitives/StatusLine';
import { noticesOf } from '#ui/notices';
import { DevStore } from '#ui/stores/DevStore';

function running(): DevStore {
    const store = new DevStore();
    store.setPhase('running');
    store.setBusy(false);
    return store;
}

interface FilterState {
    readonly filtered?: boolean;
    readonly filtersShown?: boolean;
}

function frameOf(store: DevStore, { filtered = false, filtersShown = false }: FilterState = {}): string {
    return (
        render(
            <StatusLine
                state={store.getState()}
                notices={noticesOf(store.getState())}
                filtered={filtered}
                filtersShown={filtersShown}
            />
        ).lastFrame() ?? ''
    );
}

describe('StatusLine', () => {
    it('carries the brand, the phase, and the key that opens the filters', () => {
        const frame = frameOf(running());

        expect(frame).toContain('seedcord');
        expect(frame).toContain('running');
        expect(frame).toContain('f filters');
    });

    it('offers f back while the filters show', () => {
        expect(frameOf(running(), { filtersShown: true })).toContain('f back');
    });

    it('marks the row while a filter hides lines', () => {
        expect(frameOf(running())).not.toContain('filtered');
        expect(frameOf(running(), { filtered: true })).toContain('· filtered');
    });

    it('renders the top notice with its keys', () => {
        const store = running();
        store.apply({ type: 'command-update-prompt', files: ['a.ts', 'b.ts'] });

        expect(frameOf(store)).toContain('2 commands updated');
    });

    it('counts the notices it has no room to name', () => {
        const store = running();
        store.setError(new Error('boom'));
        store.apply({ type: 'command-update-prompt', files: ['a.ts'] });

        const frame = frameOf(store);
        expect(frame).toContain('1 command updated');
        expect(frame).toContain('+1');
    });

    it('shows the prompt keys in place of the filters key', () => {
        const store = running();
        store.apply({ type: 'command-update-prompt', files: ['a.ts'] });

        const frame = frameOf(store);
        expect(frame).not.toContain('f filters');
        expect(frame).toContain('y/n');
    });

    it('keeps the action beside a summary too long for the row', () => {
        const store = running();
        store.setError(new Error('connect ECONNREFUSED 127.0.0.1:27017 while opening the pool'));

        const frame = frameOf(store);
        expect(frame).toContain('press r to restart');
        expect(frame).toContain('connect ECONNREFUSED');
    });

    it('renders on one row', () => {
        expect(frameOf(running()).split('\n')).toHaveLength(1);
    });

    // paddingX reserves the right column too which ink trims off the captured frame
    it('holds the row off the terminal edge', () => {
        expect(frameOf(running()).startsWith(' ')).toBe(true);
    });
});
