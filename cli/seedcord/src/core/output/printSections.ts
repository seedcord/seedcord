import { paint } from '@seedcord/errors';

import type { StepPrinter } from '#core/output/StepPrinter';

export interface SectionRow {
    marker?: string | undefined;
    items: string[];
}

const MARKS = { '+': paint.mint, '~': paint.iris, '-': paint.coral } satisfies Record<string, typeof paint.mint>;

export function markedRows(mark: keyof typeof MARKS, items: readonly string[]): SectionRow[] {
    const tone = MARKS[mark];
    return items.length === 0 ? [] : [{ marker: tone.bold(mark), items: items.map((item) => tone(item)) }];
}

interface RowItem {
    label: string;
    detail: string;
}

export function itemRows(items: readonly RowItem[], detailed: boolean, marker?: string): SectionRow[] {
    if (detailed) return items.map(({ label, detail }) => ({ marker, items: [`${label}  ${paint.mute(detail)}`] }));
    return items.length === 0 ? [] : [{ marker, items: items.map(({ label }) => label) }];
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
