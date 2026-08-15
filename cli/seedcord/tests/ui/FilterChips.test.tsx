import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { FilterChips } from '#ui/components/primitives/FilterChips';
import { INITIAL_CURSOR } from '#ui/filterCursor';

const CHANNELS = ['bot', 'hmr', 'gates'];

describe('FilterChips', () => {
    it('renders the chips under an open caret', () => {
        const { lastFrame } = render(
            <FilterChips
                channels={CHANNELS}
                enabledChannels={new Set()}
                enabledLevels={new Set()}
                cursor={INITIAL_CURSOR}
                open
            />
        );

        const frame = lastFrame() ?? '';
        expect(frame).toContain('▾ channels');
        expect(frame).toContain('▾ levels');
        expect(frame).toContain('gates');
        expect(frame).toContain('trace');
    });

    it('keeps only the two headings when collapsed', () => {
        const { lastFrame } = render(
            <FilterChips
                channels={CHANNELS}
                enabledChannels={new Set()}
                enabledLevels={new Set()}
                cursor={INITIAL_CURSOR}
                open={false}
            />
        );

        const frame = lastFrame() ?? '';
        expect(frame).toContain('resize to see filters');
        expect(frame).toContain('▸ channels');
        expect(frame).toContain('▸ levels');
        expect(frame).not.toContain('gates');
        expect(frame).not.toContain('trace');
        expect(frame.split('\n')).toHaveLength(3);
    });
});
