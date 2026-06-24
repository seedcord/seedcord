const segmenter = new Intl.Segmenter();

/* eslint-disable no-magic-numbers -- Unicode code-point range boundaries */
const ZERO_WIDTH_RANGES: readonly (readonly [number, number])[] = [
    [0x200b, 0x200b],
    [0x0300, 0x036f],
    [0x1ab0, 0x1aff],
    [0x1dc0, 0x1dff],
    [0x20d0, 0x20ff],
    [0xfe20, 0xfe2f]
];

const WIDE_RANGES: readonly (readonly [number, number])[] = [
    [0x1100, 0x115f],
    [0x2e80, 0x303e],
    [0x3041, 0x33ff],
    [0x3400, 0x4dbf],
    [0x4e00, 0x9fff],
    [0xa000, 0xa4cf],
    [0xac00, 0xd7a3],
    [0xf900, 0xfaff],
    [0xfe30, 0xfe4f],
    [0xff00, 0xff60],
    [0xffe0, 0xffe6],
    [0x1f300, 0x1faff],
    [0x20000, 0x3fffd]
];
/* eslint-enable no-magic-numbers */

function inRanges(cp: number, ranges: readonly (readonly [number, number])[]): boolean {
    return ranges.some(([lo, hi]) => cp >= lo && cp <= hi);
}

function segmentWidth(segment: string): number {
    const cp = segment.codePointAt(0) ?? 0;
    if (inRanges(cp, ZERO_WIDTH_RANGES)) return 0;
    // East Asian Wide and Fullwidth code points take two monospace columns
    return inRanges(cp, WIDE_RANGES) ? 2 : 1;
}

// .length counts UTF-16 units, so it miscounts emoji, astral, and CJK chars and the border drifts
export function displayWidth(text: string): number {
    let width = 0;
    for (const { segment } of segmenter.segment(text)) width += segmentWidth(segment);
    return width;
}

function segments(text: string): string[] {
    return Array.from(segmenter.segment(text), (entry) => entry.segment);
}

export function takeWidth(text: string, maxColumns: number): string {
    let width = 0;
    let taken = '';
    for (const segment of segments(text)) {
        const next = width + segmentWidth(segment);
        if (next > maxColumns) break;
        width = next;
        taken += segment;
    }
    return taken;
}

function hardBreak(token: string, maxColumns: number): string[] {
    const pieces: string[] = [];
    let rest = token;
    while (displayWidth(rest) > maxColumns) {
        const head = takeWidth(rest, maxColumns);
        pieces.push(head);
        rest = rest.slice(head.length);
    }
    if (rest.length > 0) pieces.push(rest);
    return pieces;
}

export function wrapText(text: string, maxColumns: number): string[] {
    const lines: string[] = [];
    let current = '';
    for (const token of text.split(' ')) {
        const candidate = current === '' ? token : `${current} ${token}`;
        if (displayWidth(candidate) <= maxColumns) {
            current = candidate;
            continue;
        }
        if (current !== '') lines.push(current);
        if (displayWidth(token) <= maxColumns) {
            current = token;
            continue;
        }
        const pieces = hardBreak(token, maxColumns);
        current = pieces.pop() ?? '';
        lines.push(...pieces);
    }
    if (current !== '' || lines.length === 0) lines.push(current);
    return lines;
}
