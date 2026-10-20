import { assertNever } from '@seedcord/utils';

import { formatClock } from '#ui/format';

import type { ClockPrecision } from '#ui/format';
import type { LogEntry } from '#ui/stores/LogStore';
import type { LogLevel } from '@seedcord/types';

export type PrefixCell =
    | { readonly kind: 'chip' }
    | { readonly kind: 'clock'; readonly precision: ClockPrecision }
    | { readonly kind: 'label'; readonly width: number }
    | { readonly kind: 'dot' };

type CellSource = Pick<LogEntry, 'level' | 'label' | 'timestamp'>;

interface Step {
    // the narrowest log pane that shows this step
    readonly minPane: number;
    readonly clock: ClockPrecision | null;
    readonly maxLabel: number;
}

const LABEL_CAP = 12;
const SHORT_LABEL = 6;

// the widths came from side-by-side trials while i adjusted the layout
const WIDEST: Step = { minPane: 112, clock: 'seconds', maxLabel: LABEL_CAP };
const STEPS: readonly Step[] = [
    WIDEST,
    { minPane: 100, clock: 'minutes', maxLabel: LABEL_CAP },
    { minPane: 64, clock: 'minutes', maxLabel: SHORT_LABEL },
    { minPane: 56, clock: 'minutes', maxLabel: 0 }
];
const NARROWEST: Step = { minPane: 0, clock: null, maxLabel: 0 };

const LEVEL_LETTER: Record<LogLevel, string> = { error: 'E', warn: 'W', info: 'I', debug: 'D', trace: 'T' };
const DOT = '●';
const ELLIPSIS = '…';

export const GUIDE = '│ ';
export const BAR = '▌';

export function isErrorTail(entry: LogEntry): boolean {
    return !entry.head && entry.level === 'error';
}

function truncate(label: string, width: number): string {
    return label.length > width ? `${label.slice(0, width - 1)}${ELLIPSIS}` : label;
}

export function cellText(cell: PrefixCell, source: CellSource): string {
    switch (cell.kind) {
        case 'chip': {
            return ` ${LEVEL_LETTER[source.level]} `;
        }
        case 'clock': {
            return formatClock(source.timestamp, cell.precision);
        }
        case 'label': {
            return truncate(source.label, cell.width).padStart(cell.width);
        }
        case 'dot': {
            return DOT;
        }
        default: {
            return assertNever(cell);
        }
    }
}

// cellText pads every cell to a fixed width
const PROBE: CellSource = { level: 'info', label: '', timestamp: 0 };

function cellsFor(step: Step, longestLabel: number): PrefixCell[] {
    const labelWidth = Math.min(longestLabel, step.maxLabel);
    return [
        { kind: 'chip' },
        ...(step.clock ? [{ kind: 'clock', precision: step.clock } as const] : []),
        ...(labelWidth > 0 ? [{ kind: 'label', width: labelWidth } as const] : []),
        { kind: 'dot' }
    ];
}

export class LogLayout {
    public readonly width: number;
    public readonly cells: readonly PrefixCell[];
    public readonly messageColumn: number;

    private constructor(width: number, step: Step, longestLabel: number) {
        this.width = width;
        this.cells = cellsFor(step, longestLabel);
        this.messageColumn = this.cells.reduce((sum, cell) => sum + cellText(cell, PROBE).length + 1, 0);
    }

    public static fit(width: number, longestLabel: number, full: boolean): LogLayout {
        const step = full ? WIDEST : (STEPS.find((each) => width >= each.minPane) ?? NARROWEST);
        return new LogLayout(width, step, longestLabel);
    }

    public get guideIndent(): number {
        return this.messageColumn - GUIDE.length;
    }

    public textWidth(entry: LogEntry): number {
        return this.width - (isErrorTail(entry) ? BAR.length : this.messageColumn);
    }
}
