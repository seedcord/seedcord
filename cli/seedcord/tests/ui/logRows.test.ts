import { describe, expect, it } from 'vitest';

import { computeScrollView } from '#ui/hooks/useScroll';
import { LogLayout } from '#ui/LogLayout';
import { expandRows, rowKey, wrapRows } from '#ui/logRows';

import { logEntry as entry } from './logEntry';

import type { LogRow } from '#ui/logRows';
import type { LogEntry } from '#ui/stores/LogStore';

const LABEL_WIDTH = 3;
// every width below stays under the step that shows the clock
const COLUMN = LogLayout.fit(0, LABEL_WIDTH, 'auto').messageColumn;

function wrap(logs: readonly LogEntry[], width: number): LogRow[] {
    return wrapRows(expandRows(logs), LogLayout.fit(width, LABEL_WIDTH, 'auto'));
}

function texts(rows: readonly LogRow[]): string[] {
    return rows.flatMap((row) => (row.kind === 'entry' ? [row.text] : []));
}

describe('expandRows', () => {
    it('brackets a non-error block with a rule row above and below', () => {
        const rows = expandRows([entry({ id: 1, head: true }), entry({ id: 2, head: false })]);
        expect(rows.map((row) => row.kind)).toEqual(['rule', 'entry', 'entry', 'rule']);
    });

    it('leaves a single-line log unruled', () => {
        const rows = expandRows([entry({ id: 1, head: true })]);
        expect(rows).toHaveLength(1);
        expect(rows[0]?.kind).toBe('entry');
    });

    it('leaves an error stack unruled', () => {
        const rows = expandRows([
            entry({ id: 1, level: 'error', head: true }),
            entry({ id: 2, level: 'error', head: false })
        ]);
        expect(rows.every((row) => row.kind === 'entry')).toBe(true);
    });

    it('shares one rule between two adjacent blocks', () => {
        const rows = expandRows([
            entry({ id: 1, head: true }),
            entry({ id: 2, head: false }),
            entry({ id: 3, head: true }),
            entry({ id: 4, head: false })
        ]);
        expect(rows.map((row) => row.kind)).toEqual(['rule', 'entry', 'entry', 'rule', 'entry', 'entry', 'rule']);
    });

    it('rules a non-error block next to an error block only around the non-error block', () => {
        const rows = expandRows([
            entry({ id: 1, head: true }),
            entry({ id: 2, head: false }),
            entry({ id: 3, level: 'error', head: true }),
            entry({ id: 4, level: 'error', head: false })
        ]);
        expect(rows.map((row) => row.kind)).toEqual(['rule', 'entry', 'entry', 'rule', 'entry', 'entry']);
    });
});

describe('wrapRows', () => {
    it('leaves a line that fits as one row', () => {
        const rows = wrap([entry({ id: 1, text: 'short' })], COLUMN + 20);

        expect(texts(rows)).toEqual(['short']);
    });

    it('splits a head line that overflows into rows with their own keys, marking only the first', () => {
        const rows = wrap([entry({ id: 1, text: 'aaaa bbbb cccc' })], COLUMN + 9);

        expect(texts(rows)).toEqual(['aaaa bbbb', 'cccc']);
        expect(rows.map((row) => row.kind === 'entry' && row.first)).toEqual([true, false]);
        expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
    });

    it('breaks a word longer than the width', () => {
        const rows = wrap([entry({ id: 1, text: 'a'.repeat(22) })], COLUMN + 10);

        expect(texts(rows)).toEqual(['a'.repeat(10), 'a'.repeat(10), 'aa']);
    });

    it('gives an error frame the whole width past the bar', () => {
        const text = 'a'.repeat(COLUMN + 5);
        const width = COLUMN + 10;

        const head = wrap([entry({ id: 1, level: 'error', head: true, text })], width);
        const frame = wrap(
            [
                entry({ id: 1, level: 'error', head: true, text: 'boom' }),
                entry({ id: 2, level: 'error', head: false, text })
            ],
            width
        );

        expect(texts(head).length).toBeGreaterThan(1);
        expect(texts(frame).slice(1)).toHaveLength(1);
    });

    it('hangs a wrapped stack frame under its own indent', () => {
        const frame = '    at PlayCommand.run (src/commands/play.ts:18:11)';
        const logs = [
            entry({ id: 1, level: 'error', head: true, text: 'boom' }),
            entry({ id: 2, level: 'error', head: false, frame: true, text: frame })
        ];

        const rows = wrap(logs, 40);

        expect(texts(rows).slice(1)).toEqual(['    at PlayCommand.run', '    (src/commands/play.ts:18:11)']);
    });

    it('wraps from the left edge when the indent would leave the text under 8 columns', () => {
        const frame = `${' '.repeat(35)}at PlayCommand.run`;
        const logs = [
            entry({ id: 1, level: 'error', head: true, text: 'boom' }),
            entry({ id: 2, level: 'error', head: false, frame: true, text: frame })
        ];

        const rows = wrap(logs, 40);

        expect(texts(rows).slice(1)).toEqual(['at PlayCommand.run']);
    });

    it('keeps the rule rows around a wrapped block', () => {
        const logs = [entry({ id: 1, head: true, text: 'head' }), entry({ id: 2, head: false, text: 'aaaa bbbb' })];

        const rows = wrap(logs, COLUMN + 4);

        expect(rows[0]?.kind).toBe('rule');
        expect(rows.at(-1)?.kind).toBe('rule');
    });

    it('keeps one row when the width leaves no room for text', () => {
        const rows = wrap([entry({ id: 1, text: 'aaaa bbbb' })], 2);

        expect(texts(rows)).toEqual(['aaaa bbbb']);
    });

    it('lets the scroll window stop on a wrapped tail', () => {
        const logs = [entry({ id: 1, text: 'aaaa bbbb cccc dddd' }), entry({ id: 2, text: 'tail' })];
        const rows = wrap(logs, COLUMN + 9);

        const view = computeScrollView(rows, 1, rowKey(rows[1]!), rowKey);

        expect(view.topIndex).toBe(1);
    });
});
