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
    readonly narrowestPane: number;
    readonly clock: ClockPrecision | null;
    readonly maxLabel: number;
}

const LABEL_CAP = 12;
const SHORT_LABEL = 6;

// the widths came from side-by-side trials while i adjusted the layout
const WIDEST: Step = { narrowestPane: 112, clock: 'seconds', maxLabel: LABEL_CAP };
const STEPS: readonly Step[] = [
    WIDEST,
    { narrowestPane: 100, clock: 'minutes', maxLabel: LABEL_CAP },
    { narrowestPane: 64, clock: 'minutes', maxLabel: SHORT_LABEL },
    { narrowestPane: 56, clock: 'minutes', maxLabel: 0 }
];
const NARROWEST: Step = { narrowestPane: 0, clock: null, maxLabel: 0 };

const DETAIL_MODES = {
    auto: { next: 'full', step: (width: number) => STEPS.find((each) => width >= each.narrowestPane) ?? NARROWEST },
    full: { next: 'none', step: () => WIDEST },
    none: { next: 'auto', step: () => NARROWEST }
} as const satisfies Record<string, { next: string; step: (width: number) => Step }>;

export type DetailMode = keyof typeof DETAIL_MODES;

export function nextDetailMode(mode: DetailMode): DetailMode {
    return DETAIL_MODES[mode].next;
}

export function isDetailMode(value: unknown): value is DetailMode {
    return typeof value === 'string' && Object.hasOwn(DETAIL_MODES, value);
}

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

    public static fit(width: number, longestLabel: number, details: DetailMode): LogLayout {
        return new LogLayout(width, DETAIL_MODES[details].step(width), longestLabel);
    }

    public get guideIndent(): number {
        return this.messageColumn - GUIDE.length;
    }

    public textWidth(entry: LogEntry): number {
        return this.width - (isErrorTail(entry) ? BAR.length : this.messageColumn);
    }
}
