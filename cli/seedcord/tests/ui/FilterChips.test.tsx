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
                filters={{ channels: new Set(), levels: new Set() }}
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

    it('sums up each filter beside its collapsed heading', () => {
        const { lastFrame } = render(
            <FilterChips
                channels={CHANNELS}
                filters={{ channels: new Set(['hmr', 'gates']), levels: new Set() }}
                cursor={INITIAL_CURSOR}
                open={false}
            />
        );

        expect((lastFrame() ?? '').split('\n')).toEqual(['▸ channels  hmr +1', '▸ levels    all']);
    });
});
