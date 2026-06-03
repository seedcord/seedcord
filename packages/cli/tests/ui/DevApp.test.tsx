import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { DevApp } from '@ui/DevApp';
import { DevStore } from '@ui/stores/DevStore';

function runningStore(): DevStore {
    const store = new DevStore();
    store.setPhase('running');
    store.setBusy(false);
    store.setStatus('Connected as TestBot');
    return store;
}

describe('DevApp render smoke', () => {
    it('renders without throwing', () => {
        const store = runningStore();
        const { lastFrame, unmount } = render(<DevApp store={store} onReady={() => undefined} />);

        const frame = lastFrame();
        expect(frame).toBeTruthy();
        expect(frame).toContain('seedcord');
        expect(frame).toContain('running');
        expect(frame).toContain('channels');

        unmount();
    });
});
