import { Box, Text } from 'ink';
import { render } from 'ink-testing-library';
import React, { useRef } from 'react';
import { describe, expect, it } from 'vitest';

import { useRailWidth } from '@ui/hooks/useRailWidth';

import type { DevPhase } from '@ui/stores/devPhase';
import type { DOMElement } from 'ink';
import type { ReactElement } from 'react';

// a row parent keeps the rail at its natural content width, and the readout sits outside the measured box
function Harness({ phase, label }: { readonly phase: DevPhase; readonly label: string }): ReactElement {
    const railRef = useRef<DOMElement | null>(null);
    const width = useRailWidth(railRef, phase, 24, 80);
    return (
        <Box flexDirection="row">
            <Box ref={railRef} width={width ?? undefined} flexShrink={0}>
                <Text>{label}</Text>
            </Box>
            <Text>w:{width ?? 'null'}</Text>
        </Box>
    );
}

// lets the layout effect's state update commit before reading the frame
const flush = async (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('useRailWidth', () => {
    it('holds no width before the session runs', async () => {
        const { lastFrame, unmount } = render(<Harness phase="starting" label="abcde" />);
        await flush();

        expect(lastFrame()).toContain('w:null');
        unmount();
    });

    it('locks the rail width at the first running render', async () => {
        const { lastFrame, rerender, unmount } = render(<Harness phase="starting" label="abcde" />);
        await flush();

        rerender(<Harness phase="running" label="abcde" />);
        await flush();

        expect(lastFrame()).toContain('w:5');
        unmount();
    });

    it('holds the lock while the session stays running', async () => {
        const { lastFrame, rerender, unmount } = render(<Harness phase="running" label="abcde" />);
        await flush();

        rerender(<Harness phase="running" label="abcdefghij" />);
        await flush();

        expect(lastFrame()).toContain('w:5');
        unmount();
    });

    it('resets and re-measures across a restart', async () => {
        const { lastFrame, rerender, unmount } = render(<Harness phase="running" label="abcde" />);
        await flush();
        expect(lastFrame()).toContain('w:5');

        rerender(<Harness phase="starting" label="abcdefghij" />);
        await flush();

        rerender(<Harness phase="running" label="abcdefghij" />);
        await flush();

        expect(lastFrame()).toContain('w:10');
        unmount();
    });
}, 10_000);
