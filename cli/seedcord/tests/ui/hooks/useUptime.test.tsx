import { Text } from 'ink';
import { render } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { settled } from '#tests/ui/settled';
import { useUptime } from '#ui/hooks/useUptime';
import { DevStore } from '#ui/stores/DevStore';

import type { DevState } from '#ui/stores/DevStore';
import type { ReactElement } from 'react';

const SECOND_MS = 1000;

function Harness({ state, shown }: { readonly state: DevState; readonly shown: boolean }): ReactElement {
    const uptimeMs = useUptime(state, shown);
    return <Text>up:{uptimeMs === null ? 'null' : Math.floor(uptimeMs / SECOND_MS)}</Text>;
}

function liveState(): DevState {
    const store = new DevStore();
    store.setPhase('running');
    return store.getState();
}

describe('useUptime', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('ticks while the sidebar renders it', async () => {
        const { lastFrame, unmount } = render(<Harness state={liveState()} shown />);
        await settled(() => expect(lastFrame()).toContain('up:0'));
        unmount();
    });

    it('stays off when no sidebar renders it', async () => {
        const { lastFrame, unmount } = render(<Harness state={liveState()} shown={false} />);
        await settled(() => expect(lastFrame()).toContain('up:null'));
        unmount();
    });

    it('counts from when the session went live after the sidebar comes back', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        const state = liveState();
        const { lastFrame, rerender, unmount } = render(<Harness state={state} shown />);

        vi.setSystemTime(Date.now() + 65 * SECOND_MS);
        rerender(<Harness state={state} shown={false} />);
        rerender(<Harness state={state} shown />);

        await settled(() => expect(lastFrame()).toContain('up:65'));
        unmount();
    });
}, 10_000);
