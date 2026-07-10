import type { LogEntry } from '@ui/stores/LogStore';

// a rendered log row: an entry line, or a full-width rule bracketing a block. materializing rules as rows
// keeps the scroll math at one row per item, so a block's rules never overflow the measured viewport.
export type LogRow = { kind: 'entry'; key: number; entry: LogEntry } | { kind: 'rule'; key: string };

function isBlockLine(entry: LogEntry | undefined): boolean {
    return entry !== undefined && entry.level !== 'error';
}

function opensBlock(logs: readonly LogEntry[], index: number): boolean {
    const log = logs[index];
    const next = logs[index + 1];
    return log?.head === true && isBlockLine(log) && next !== undefined && !next.head && isBlockLine(next);
}

function closesBlock(logs: readonly LogEntry[], index: number): boolean {
    const log = logs[index];
    const next = logs[index + 1];
    return log !== undefined && !log.head && isBlockLine(log) && (next === undefined || next.head);
}

// a non-error continuation above already drew this block's bottom rule, so adjacent blocks share one
function prevClosedBlock(logs: readonly LogEntry[], index: number): boolean {
    const prev = logs[index - 1];
    return prev !== undefined && !prev.head && isBlockLine(prev);
}

export function expandRows(logs: readonly LogEntry[]): LogRow[] {
    const rows: LogRow[] = [];
    for (const [index, entry] of logs.entries()) {
        if (opensBlock(logs, index) && !prevClosedBlock(logs, index)) {
            rows.push({ kind: 'rule', key: `top-${entry.id}` });
        }
        rows.push({ kind: 'entry', key: entry.id, entry });
        if (closesBlock(logs, index)) rows.push({ kind: 'rule', key: `bottom-${entry.id}` });
    }
    return rows;
}

export function rowKey(row: LogRow): number | string {
    return row.key;
}
