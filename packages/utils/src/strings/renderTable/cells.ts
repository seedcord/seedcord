import { displayWidth, takeWidth } from './displayWidth';

import type { Alignment } from './options';

const ELLIPSIS = '…';

export function wrapFence(content: string): string {
    return `\`\`\`\n${content}\`\`\``;
}

export function truncate(content: string, maxWidth: number): string {
    if (displayWidth(content) <= maxWidth) return content;
    return takeWidth(content, maxWidth - displayWidth(ELLIPSIS)) + ELLIPSIS;
}

export function isNumericColumn(grid: readonly (readonly string[])[], col: number, header: boolean): boolean {
    // the header label is rarely numeric
    const dataRows = header ? grid.slice(1) : grid;
    const cells = dataRows.map((row) => row[col] ?? '').filter((cell) => cell !== '');
    return cells.length > 0 && cells.every((cell) => !Number.isNaN(Number(cell)));
}

export function padCell(content: string, columnWidth: number, align: Alignment): string {
    const slack = columnWidth - displayWidth(content);
    if (align === 'right') return ' '.repeat(slack) + content;
    if (align === 'center') {
        const left = Math.floor(slack / 2);
        return ' '.repeat(left) + content + ' '.repeat(slack - left);
    }
    return content + ' '.repeat(slack);
}
