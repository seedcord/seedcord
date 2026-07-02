import { padCell } from './cells';
import { displayWidth } from './displayWidth';

import type { Alignment } from './options';

export function renderMarkdown(
    grid: readonly (readonly string[])[],
    columnCount: number,
    alignments: readonly Alignment[],
    pad: string
): string {
    // a raw | or \ in a cell would split or corrupt the GFM row, so escape before measuring widths
    const escapeCell = (value: string): string => value.replaceAll('\\', '\\\\').replaceAll('|', String.raw`\|`);
    const escaped = grid.map((row) => Array.from({ length: columnCount }, (_, col) => escapeCell(row[col] ?? '')));

    const columnWidths = Array.from({ length: columnCount }, (_, col) =>
        escaped.reduce((max, row) => Math.max(max, displayWidth(row[col] ?? '')), 0)
    );

    const cell = (content: string, col: number): string =>
        pad + padCell(content, columnWidths[col] ?? 0, alignments[col] ?? 'left') + pad;
    const row = (cells: readonly string[]): string =>
        `|${columnWidths.map((_, col) => cell(cells[col] ?? '', col)).join('|')}|`;

    const delimiterCell = (col: number): string => {
        const align = alignments[col] ?? 'left';
        if (align === 'center') return ' :---: ';
        if (align === 'right') return ' ---: ';
        return ' --- ';
    };

    const [head = [], ...body] = escaped;
    const delimiter = `|${columnWidths.map((_, col) => delimiterCell(col)).join('|')}|`;
    const lines = [row(head), delimiter, ...body.map(row)];
    return `${lines.join('\n')}\n`;
}
