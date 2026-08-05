import { describe, expect, it } from 'vitest';

import { computeScrollView } from '@ui/hooks/useScroll';
import { expandRows, messageColumn, rowKey, wrapRows } from '@ui/logRows';

import type { LogEntry } from '@ui/stores/LogStore';

const LABEL_WIDTH = 3;
const COLUMN = messageColumn(LABEL_WIDTH);

function entry(over: Partial<LogEntry>): LogEntry {
    return {
        id: 0,
        channel: 'default',
        level: 'info',
        label: 'Bot',
        text: '',
        timestamp: 0,
        head: true,
        frame: false,
        ...over
    };
}

function wrap(logs: readonly LogEntry[], width: number): ReturnType<typeof wrapRows> {
    return wrapRows(expandRows(logs), width, LABEL_WIDTH);
}

function texts(rows: ReturnType<typeof wrapRows>): string[] {
    return rows.flatMap((row) => (row.kind === 'entry' ? [row.text] : []));
}

describe('wrapRows', () => {
    it('leaves a line that fits as one row', () => {
        const rows = wrap([entry({ id: 1, text: 'short' })], COLUMN + 20);

        expect(texts(rows)).toEqual(['short']);
    });

    it('splits a head line that overflows the message column', () => {
        const rows = wrap([entry({ id: 1, text: 'aaaa bbbb cccc' })], COLUMN + 9);

        expect(texts(rows)).toEqual(['aaaa bbbb', 'cccc']);
    });

    it('marks only the head line first, so the tail drops the prefix', () => {
        const rows = wrap([entry({ id: 1, text: 'aaaa bbbb cccc' })], COLUMN + 9);

        expect(rows.map((row) => row.kind === 'entry' && row.first)).toEqual([true, false]);
    });

    it('gives every row of one entry a distinct key', () => {
        const rows = wrap([entry({ id: 1, text: 'aaaa bbbb cccc' })], COLUMN + 9);

        expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
    });

    it('breaks a word longer than the width instead of overflowing', () => {
        const rows = wrap([entry({ id: 1, text: 'a'.repeat(22) })], COLUMN + 10);

        expect(texts(rows)).toEqual(['a'.repeat(10), 'a'.repeat(10), 'aa']);
    });

    it('gives an error frame the whole width past the bar, so it fits where a head line wraps', () => {
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

    it('keeps the rule rows around a wrapped block', () => {
        const logs = [entry({ id: 1, head: true, text: 'head' }), entry({ id: 2, head: false, text: 'aaaa bbbb' })];

        const rows = wrap(logs, COLUMN + 4);

        expect(rows[0]?.kind).toBe('rule');
        expect(rows.at(-1)?.kind).toBe('rule');
    });

    it('re-splits the same entry when the width changes', () => {
        const logs = [entry({ id: 1, text: 'aaaa bbbb cccc' })];

        expect(texts(wrap(logs, COLUMN + 9))).toHaveLength(2);
        expect(texts(wrap(logs, COLUMN + 20))).toHaveLength(1);
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
