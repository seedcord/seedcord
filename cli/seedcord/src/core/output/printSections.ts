import { paint } from '@seedcord/errors';

import type { StepPrinter } from '#core/output/StepPrinter';

export interface SectionRow {
    marker?: string | undefined;
    items: string[];
}

interface RowItem {
    label: string;
    detail: string;
}

// one row for all the labels, or a row each when the details show
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
