import { describe, expect, it } from 'vitest';

import { filterLogs } from '@ui/hooks/useLogs';

import type { LogEntry } from '@ui/stores/LogStore';

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

describe('filterLogs', () => {
    const logs = [
        entry({ id: 1, channel: 'default', level: 'info' }),
        entry({ id: 2, channel: 'hmr', level: 'trace' }),
        entry({ id: 3, channel: 'default', level: 'error' })
    ];

    it('returns all logs when both filters are empty', () => {
        expect(filterLogs(logs, new Set(), new Set())).toEqual(logs);
    });

    it('filters by channel', () => {
        expect(filterLogs(logs, new Set(['hmr']), new Set()).map((log) => log.id)).toEqual([2]);
    });

    it('filters by level', () => {
        expect(filterLogs(logs, new Set(), new Set(['info', 'error'])).map((log) => log.id)).toEqual([1, 3]);
    });

    it('applies channel and level filters together', () => {
        expect(filterLogs(logs, new Set(['default']), new Set(['error'])).map((log) => log.id)).toEqual([3]);
    });
});
