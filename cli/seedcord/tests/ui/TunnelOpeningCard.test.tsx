import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { TunnelOpeningCard } from '@ui/components/TunnelOpeningCard';

function rowsOf(frame: string): string[] {
    return frame.split('\n').filter((line) => /Opening|Waiting|Telling/.test(line));
}

describe('TunnelOpeningCard', () => {
    it('lists every step', () => {
        const frame = render(<TunnelOpeningCard phase="opening" />).lastFrame() ?? '';

        expect(rowsOf(frame)).toHaveLength(3);
    });

    it('checks off the steps behind the one running', () => {
        const frame = render(<TunnelOpeningCard phase="registering" />).lastFrame() ?? '';
        const [first, second, third] = rowsOf(frame);

        expect(first).toContain('✔');
        expect(second).toContain('✔');
        expect(third).not.toContain('✔');
    });

    it('leaves the steps ahead unchecked', () => {
        const frame = render(<TunnelOpeningCard phase="opening" />).lastFrame() ?? '';

        expect(rowsOf(frame).filter((row) => row.includes('✔'))).toHaveLength(0);
    });
});
