import { paint } from '@seedcord/errors';

import type { StepPrinter } from '#core/output/StepPrinter';

export interface SectionRow {
    marker?: string | undefined;
    items: string[];
}

type Tone = typeof paint.mint;

const MARKS = { '+': paint.mint, '~': paint.iris, '-': paint.coral } satisfies Record<string, Tone>;
export type Mark = keyof typeof MARKS;

// for a label that paints part of itself in another tone
export function markedRowsOf<Item>(
    mark: Mark,
    items: readonly Item[],
    labelOf: (item: Item, tone: Tone) => string
): SectionRow[] {
    const tone = MARKS[mark];
    return items.length === 0 ? [] : [{ marker: tone.bold(mark), items: items.map((item) => labelOf(item, tone)) }];
}

export function markedRows(mark: Mark, labels: readonly string[]): SectionRow[] {
    return markedRowsOf(mark, labels, (label, tone) => tone(label));
}

export interface RowItem {
    label: string;
    detail: string;
}

// one row per item with its detail when `detailed`, else one row of labels. a mark paints the labels too
export function itemRows(items: readonly RowItem[], detailed: boolean, mark?: Mark): SectionRow[] {
    const marker = mark && MARKS[mark].bold(mark);
    const labelOf = ({ label }: RowItem): string => (mark ? MARKS[mark](label) : label);
    if (detailed) return items.map((item) => ({ marker, items: [`${labelOf(item)}  ${paint.mute(item.detail)}`] }));
    return items.length === 0 ? [] : [{ marker, items: items.map(labelOf) }];
}

export interface Section {
    title: string;
    note?: string;
    rows: SectionRow[];
}

type SectionOutput = Pick<StepPrinter<string>, 'line' | 'wrapped'>;

export function printSections(output: SectionOutput, sections: readonly Section[]): void {
    output.line();
    for (const { title, note, rows } of sections) {
        output.line(note ? `${paint.bold(title)}  ${paint.mute(note)}` : paint.bold(title));
        for (const { marker = ' ', items } of rows) {
            output.wrapped(items.join(' '), { first: `  ${marker} `, rest: '    ' });
        }
        output.line();
    }
}
