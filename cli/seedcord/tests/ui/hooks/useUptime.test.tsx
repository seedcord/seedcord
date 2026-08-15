import { Text } from 'ink';
import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { useUptime } from '#ui/hooks/useUptime';

import { settled } from '../settled';

import type { DevState } from '#ui/stores/DevStore';
import type { ReactElement } from 'react';

// the hook reads the phase alone
const RUNNING = { phase: 'running' } as unknown as DevState;

function Harness({ shown }: { readonly shown: boolean }): ReactElement {
    const uptimeMs = useUptime(RUNNING, shown);
    return <Text>up:{uptimeMs === null ? 'null' : 'ticking'}</Text>;
}

describe('useUptime', () => {
    it('ticks while the sidebar renders it', async () => {
        const { lastFrame, unmount } = render(<Harness shown />);
        await settled(() => expect(lastFrame()).toContain('up:ticking'));
        unmount();
    });

    it('stays off when no sidebar renders it', async () => {
        const { lastFrame, unmount } = render(<Harness shown={false} />);
        await settled(() => expect(lastFrame()).toContain('up:null'));
        unmount();
    });
}, 10_000);
