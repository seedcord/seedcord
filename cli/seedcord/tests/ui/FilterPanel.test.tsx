import { Box } from 'ink';
import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { FilterPanel } from '#ui/components/primitives/FilterPanel';
import { INITIAL_CURSOR } from '#ui/filterCursor';

describe('FilterPanel', () => {
    it('wraps the keys whole on a phone-width terminal', () => {
        const { lastFrame } = render(
            <Box width={30}>
                <FilterPanel filters={{ channels: new Set(), levels: new Set() }} cursor={INITIAL_CURSOR} />
            </Box>
        );

        const frame = lastFrame() ?? '';
        for (const key of ['←→ select', 'tab group', 'space filter', 'o toggle']) expect(frame).toContain(key);
    });
});
