import { Box, Text } from 'ink';
import { render } from 'ink-testing-library';
import React, { useRef } from 'react';
import { describe, expect, it } from 'vitest';

import { useMeasuredBox } from '@ui/hooks/useMeasuredBox';

import { settled } from '../settled';

import type { DOMElement } from 'ink';
import type { ReactElement } from 'react';

// the readout renders outside the box, so it cannot change the size it reports
function Harness({ lines, mounted = true }: { readonly lines: number; readonly mounted?: boolean }): ReactElement {
    const boxRef = useRef<DOMElement | null>(null);
    const box = useMeasuredBox(boxRef);

    return (
        <Box flexDirection="column">
            {mounted ? (
                <Box ref={boxRef} flexDirection="column" flexShrink={0}>
                    {Array.from({ length: lines }, (_, index) => (
                        <Text key={index}>row</Text>
                    ))}
                </Box>
            ) : null}
            <Text>
                h:{box.height} w:{box.width}
            </Text>
        </Box>
    );
}

describe('useMeasuredBox', () => {
    it('holds 0 until the first measurement lands', async () => {
        const { lastFrame, unmount } = render(<Harness lines={3} mounted={false} />);

        await settled(() => expect(lastFrame()).toContain('h:0'));
        unmount();
    });

    it('reports the height the box renders at', async () => {
        const { lastFrame, unmount } = render(<Harness lines={3} />);

        await settled(() => expect(lastFrame()).toContain('h:3'));
        unmount();
    });

    // the terminal size holds still here, so a dependency list keyed on it would miss this
    it('follows the height when the box content changes', async () => {
        const { lastFrame, rerender, unmount } = render(<Harness lines={3} />);
        await settled(() => expect(lastFrame()).toContain('h:3'));

        rerender(<Harness lines={7} />);

        await settled(() => expect(lastFrame()).toContain('h:7'));
        unmount();
    });
}, 20_000);
