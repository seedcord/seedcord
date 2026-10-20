import { describe, expect, it } from 'vitest';

import { LogLayout } from '#ui/LogLayout';

function shape(layout: LogLayout): string {
    return layout.cells
        .map((cell) => {
            if (cell.kind === 'clock') return `clock:${cell.precision}`;
            if (cell.kind === 'label') return `label:${String(cell.width)}`;
            return cell.kind;
        })
        .join(' ');
}

describe('LogLayout', () => {
    it('shows the whole prefix when the pane is wide', () => {
        const layout = LogLayout.fit(120, 8);

        expect(shape(layout)).toBe('chip clock:seconds label:8 dot');
        expect(layout.messageColumn).toBe(24);
    });

    it('caps a long label at 12 columns', () => {
        expect(shape(LogLayout.fit(120, 19))).toBe('chip clock:seconds label:12 dot');
    });

    // each step's first width leaves the message exactly 40 columns
    it.each([
        [68, 'chip clock:seconds label:12 dot', 28],
        [67, 'chip clock:minutes label:12 dot', 25],
        [65, 'chip clock:minutes label:12 dot', 25],
        [64, 'chip clock:minutes label:6 dot', 19],
        [59, 'chip clock:minutes label:6 dot', 19],
        [58, 'chip label:6 dot', 13],
        [53, 'chip label:6 dot', 13],
        [52, 'chip dot', 6],
        [10, 'chip dot', 6]
    ])('fits the prefix to a %i-column pane', (width, expected, column) => {
        const layout = LogLayout.fit(width, 12);

        expect(shape(layout)).toBe(expected);
        expect(layout.messageColumn).toBe(column);
    });
});
