import wrapAnsi from 'wrap-ansi';

import type { LogEntry } from '#ui/stores/LogStore';

const CHIP_WIDTH = 3;
const TIME_WIDTH = 8;
const DOT_WIDTH = 1;
const BAR_WIDTH = 1;
const MIN_TEXT_WIDTH = 8;

export const messageColumn = (labelWidth: number): number =>
    CHIP_WIDTH + 1 + TIME_WIDTH + 1 + labelWidth + 1 + DOT_WIDTH + 1;

// one row per rendered line, which the viewport math uses
export type LogRow =
    { kind: 'entry'; key: string; entry: LogEntry; text: string; first: boolean } | { kind: 'rule'; key: string };

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

// the gutters mirror what ScrollableLogView draws in front of each line
function textWidth(entry: LogEntry, width: number, labelWidth: number): number {
    const gutter = !entry.head && entry.level === 'error' ? BAR_WIDTH : messageColumn(labelWidth);
    return width - gutter;
}

export function wrapRows(rows: readonly LogRow[], width: number, labelWidth: number): LogRow[] {
    return rows.flatMap((row) => {
        if (row.kind === 'rule') return row;

        const available = textWidth(row.entry, width, labelWidth);
        // nothing left to wrap into at this width, and the render truncates
        if (available < MIN_TEXT_WIDTH) return row;

        // trim would strip a stack frame's leading indentation
        const lines = wrapAnsi(row.text, available, { hard: true, trim: false }).split('\n');
        return lines.map((text, index) => ({
            kind: 'entry' as const,
            key: `${row.key}:${String(index)}`,
            entry: row.entry,
            // the wrap break leaves a leading space that would misalign the tail
            text: index === 0 ? text : text.replace(/^ +/, ''),
            first: index === 0
        }));
    });
}

export function rowKey(row: LogRow): number | string {
    return row.key;
}
