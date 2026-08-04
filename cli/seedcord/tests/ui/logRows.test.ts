import { describe, expect, it } from 'vitest';

import { expandRows } from '@ui/logRows';

import type { LogEntry } from '@ui/stores/LogStore';

function entry(over: Partial<LogEntry>): LogEntry {
    return { id: 0, channel: 'default', level: 'info', label: 'Bot', text: '', timestamp: 0, head: true, ...over };
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
