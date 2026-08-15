import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ErrorDisplay } from '#ui/components/ErrorDisplay';

const BOTTOM = '╰';

describe('ErrorDisplay', () => {
    it('closes the border directly under its last line', () => {
        const lines = (render(<ErrorDisplay error={new Error('boom')} />).lastFrame() ?? '').split('\n');
        const action = lines.findIndex((line) => line.includes('press r to restart'));

        expect(action).toBeGreaterThan(0);
        expect(lines[action + 1]).toContain(BOTTOM);
    });
});
