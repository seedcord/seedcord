import { BORDERS } from './borders';
import { isNumericColumn, padCell, truncate, wrapFence } from './cells';
import { displayWidth, wrapText } from './displayWidth';
import { renderMarkdown } from './markdown';

import type { LinePart } from './borders';
import type { BorderStyle, Overflow, TableOptions } from './options';

// a GFM cell holds one line, leaving truncation as markdown's only way to honour maxWidth
function truncationWidth(maxWidth: number | undefined, overflow: Overflow, border: BorderStyle): number | undefined {
    if (maxWidth === undefined) return undefined;
    return overflow === 'truncate' || border === 'markdown' ? maxWidth : undefined;
}

export function renderSingle(data: readonly (readonly string[])[], options?: TableOptions): string {
    if (data.length === 0) return '';

    const {
        align,
        border = 'rounded',
        header = true,
        padding = 1,
        emptyCell = '',
        numericAlign = false,
        maxWidth,
        overflow = 'wrap',
        fence
    } = options ?? {};

    const columnCount = data.reduce((max, row) => Math.max(max, row.length), 0);
    if (columnCount === 0) return '';

    const cutAt = truncationWidth(maxWidth, overflow, border);

    // a raw newline in a cell would split the framed output across physical lines
    const grid = data.map((row) =>
        Array.from({ length: columnCount }, (_, i) => {
            const cell = (row[i] ?? '').replaceAll(/\r?\n/g, ' ');
            const filled = cell === '' ? emptyCell : cell;
            return cutAt === undefined ? filled : truncate(filled, cutAt);
        })
    );

    const alignments = Array.from({ length: columnCount }, (_, col) => {
        const explicit = typeof align === 'string' ? align : align?.[col];
        if (explicit) return explicit;
        if (numericAlign && isNumericColumn(grid, col, header)) return 'right';
        return 'left';
    });

    const pad = ' '.repeat(padding);

    if (border === 'markdown') {
        const md = renderMarkdown(grid, columnCount, alignments, pad, header);
        return fence ? wrapFence(md) : md;
    }

    const wrap = maxWidth !== undefined && overflow === 'wrap';
    const rows = grid.map((row) => row.map((cell) => (wrap ? wrapText(cell, maxWidth) : [cell])));

    const columnWidths = Array.from({ length: columnCount }, (_, col) =>
        rows.reduce(
            (max, row) =>
                Math.max(
                    max,
                    (row[col] ?? []).reduce((w, line) => Math.max(w, displayWidth(line)), 0)
                ),
            0
        )
    );

    const chars = BORDERS[border];

    function drawLine(part: LinePart): string {
        const segments = columnWidths.map((width) => part.fill.repeat(width + padding * 2));
        return part.left + segments.join(part.mid) + part.right;
    }

    function renderRow(row: readonly (readonly string[])[]): string {
        const lineCount = row.reduce((max, cellLines) => Math.max(max, cellLines.length), 1);
        const physical = Array.from({ length: lineCount }, (_, line) =>
            columnWidths
                .map((width, col) => pad + padCell(row[col]?.[line] ?? '', width, alignments[col] ?? 'left') + pad)
                .join(chars.vertical)
        );
        return physical.map((line) => chars.vertical + line + chars.vertical).join('\n');
    }

    const lines: string[] = [drawLine(chars.top)];
    rows.forEach((row, rowIndex) => {
        lines.push(renderRow(row));
        if (rowIndex >= rows.length - 1) return;
        lines.push(drawLine(header && rowIndex === 0 ? chars.headerSep : chars.sep));
    });
    lines.push(drawLine(chars.bottom));

    const body = `${lines.join('\n')}\n`;
    return fence ? wrapFence(body) : body;
}
