import { padCell } from './cells';

import type { Alignment } from './options';

export function renderMarkdown(
    grid: readonly (readonly string[])[],
    columnWidths: readonly number[],
    alignments: readonly Alignment[],
    pad: string
): string {
    const cell = (content: string, col: number): string =>
        pad + padCell(content, columnWidths[col] ?? 0, alignments[col] ?? 'left') + pad;
    const row = (cells: readonly string[]): string =>
        `|${columnWidths.map((_, col) => cell(cells[col] ?? '', col)).join('|')}|`;

    const [head = [], ...body] = grid;
    const delimiter = `|${columnWidths.map(() => ' --- ').join('|')}|`;
    const lines = [row(head), delimiter, ...body.map(row)];
    return `${lines.join('\n')}\n`;
}
