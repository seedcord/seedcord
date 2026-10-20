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
    it('shows the whole prefix when the pane is wide, at any width on full, and none of it on none', () => {
        const layout = LogLayout.fit(120, 8, 'auto');

        expect(shape(layout)).toBe('chip clock:seconds label:8 dot');
        expect(layout.messageColumn).toBe(24);
        expect(shape(LogLayout.fit(30, 8, 'full'))).toBe(shape(layout));
        expect(shape(LogLayout.fit(120, 8, 'none'))).toBe('chip dot');
    });

    it('caps a long label at 12 columns', () => {
        expect(shape(LogLayout.fit(120, 19, 'auto'))).toBe('chip clock:seconds label:12 dot');
    });

    // each step's narrowest pane, then a pane one cell narrower
    it.each([
        [112, 'chip clock:seconds label:12 dot', 28],
        [111, 'chip clock:minutes label:12 dot', 25],
        [100, 'chip clock:minutes label:12 dot', 25],
        [99, 'chip clock:minutes label:6 dot', 19],
        [64, 'chip clock:minutes label:6 dot', 19],
        [63, 'chip clock:minutes dot', 12],
        [56, 'chip clock:minutes dot', 12],
        [55, 'chip dot', 6],
        [10, 'chip dot', 6]
    ])('fits the prefix to a %i-column pane', (width, expected, column) => {
        const layout = LogLayout.fit(width, 12, 'auto');

        expect(shape(layout)).toBe(expected);
        expect(layout.messageColumn).toBe(column);
    });
});
