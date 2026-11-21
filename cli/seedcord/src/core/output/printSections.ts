import { paint } from '@seedcord/errors';

import type { StepPrinter } from '#core/output/StepPrinter';

export interface SectionRow {
    marker?: string;
    items: string[];
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
