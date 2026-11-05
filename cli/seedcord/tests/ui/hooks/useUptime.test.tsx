import { settled } from '@seedcord/cli-prompts/testing';
import { Text } from 'ink';
import { render } from 'ink-testing-library';
import React from 'react';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vite-plus/test';

import { useUptime } from '#ui/hooks/useUptime.ts';
import { DevStore } from '#ui/stores/DevStore.ts';

import type { DevState } from '#ui/stores/DevStore.ts';
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

    it('ticks every second while the sidebar renders it', async () => {
        vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
        const { lastFrame, unmount } = render(<Harness state={liveState()} shown />);

        vi.advanceTimersByTime(2 * SECOND_MS);

        await settled(() => expect(lastFrame()).toContain('up:2'));
        unmount();
    });

    it('counts a whole second from the moment the session went live', () => {
        vi.useFakeTimers({ toFake: ['Date'], now: 1900 });
        const state = liveState();

        vi.setSystemTime(2900);
        const { lastFrame, unmount } = render(<Harness state={state} shown />);

        expect(lastFrame()).toBe('up:1');
        unmount();
    });

    it('stays off when no sidebar renders it', async () => {
        const { lastFrame, unmount } = render(<Harness state={liveState()} shown={false} />);
        await settled(() => expect(lastFrame()).toContain('up:null'));
        unmount();
    });

    // react's dev build reads the snapshot twice on mount and logs when the two differ
    it('reads one snapshot even when a second ticks over between two reads', () => {
        vi.useFakeTimers({ toFake: ['Date'], now: 1000 });
        const state = liveState();
        let clock = 1999;
        vi.spyOn(Date, 'now').mockImplementation(() => clock++);
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        onTestFinished(() => {
            vi.restoreAllMocks();
        });

        render(<Harness state={state} shown />).unmount();

        expect(consoleError).not.toHaveBeenCalled();
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
