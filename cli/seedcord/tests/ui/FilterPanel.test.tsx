import { Box } from 'ink';
import { render } from 'ink-testing-library';
import React, { createRef } from 'react';
import { describe, expect, it } from 'vite-plus/test';

import { FilterPanel } from '#ui/components/primitives/FilterPanel.tsx';
import { INITIAL_CURSOR } from '#ui/filterCursor.ts';

import type { PanelFit } from '#ui/hooks/usePanelFit.ts';

const FITS: PanelFit = { panelRef: createRef(), contentRef: createRef(), fits: true };

describe('FilterPanel', () => {
    it('wraps the keys whole on a phone-width terminal', () => {
        const { lastFrame } = render(
            <Box width={30}>
                <FilterPanel filters={{ channels: new Set(), levels: new Set() }} cursor={INITIAL_CURSOR} {...FITS} />
            </Box>
        );

        const frame = lastFrame() ?? '';
        for (const key of ['←→ select', 'tab group', 'space filter', 'o toggle']) expect(frame).toContain(key);
    });
});
