import wrapAnsi from 'wrap-ansi';

import type { LogLayout } from '#ui/LogLayout';
import type { LogEntry } from '#ui/stores/LogStore';

const MIN_TEXT_WIDTH = 8;

export interface EntryRow {
    readonly kind: 'entry';
    readonly key: string;
    readonly entry: LogEntry;
    readonly text: string;
    readonly first: boolean;
}

// one row per rendered line, which the viewport math uses
export type LogRow = EntryRow | { readonly kind: 'rule'; readonly key: string };

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

// adjacent blocks share one rule, because the block above already drew its bottom
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
        rows.push({ kind: 'entry', key: String(entry.id), entry, text: entry.text, first: true });
        if (closesBlock(logs, index)) rows.push({ kind: 'rule', key: `bottom-${entry.id}` });
    }
    return rows;
}

function hangingIndent(text: string, available: number): string {
    const indent = /^ */.exec(text)?.[0] ?? '';
    return available - indent.length < MIN_TEXT_WIDTH ? '' : indent;
}

export function wrapRows(rows: readonly LogRow[], layout: LogLayout): LogRow[] {
    return rows.flatMap((row) => {
        if (row.kind === 'rule') return row;

        const available = layout.textWidth(row.entry);
        // the render truncates a row this narrow
        if (available < MIN_TEXT_WIDTH) return row;

        const indent = hangingIndent(row.text, available);
        const lines = wrapAnsi(row.text.slice(indent.length), available - indent.length, { hard: true }).split('\n');
        return lines.map((text, index) => ({
            kind: 'entry' as const,
            key: `${row.key}:${String(index)}`,
            entry: row.entry,
            text: `${indent}${text}`,
            first: index === 0
        }));
    });
}

export function rowKey(row: LogRow): number | string {
    return row.key;
}
