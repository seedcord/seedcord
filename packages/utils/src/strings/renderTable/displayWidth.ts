const segmenter = new Intl.Segmenter();

/* eslint-disable no-magic-numbers -- Unicode code-point range boundaries */
const ZERO_WIDTH_RANGES: readonly (readonly [number, number])[] = [
    [0x20_0b, 0x20_0b],
    [0x03_00, 0x03_6f],
    [0x1a_b0, 0x1a_ff],
    [0x1d_c0, 0x1d_ff],
    [0x20_d0, 0x20_ff],
    [0xfe_20, 0xfe_2f]
];

const WIDE_RANGES: readonly (readonly [number, number])[] = [
    [0x11_00, 0x11_5f],
    [0x2e_80, 0x30_3e],
    [0x30_41, 0x33_ff],
    [0x34_00, 0x4d_bf],
    [0x4e_00, 0x9f_ff],
    [0xa0_00, 0xa4_cf],
    [0xac_00, 0xd7_a3],
    [0xf9_00, 0xfa_ff],
    [0xfe_30, 0xfe_4f],
    [0xff_00, 0xff_60],
    [0xff_e0, 0xff_e6],
    [0x1_f3_00, 0x1_fa_ff],
    [0x2_00_00, 0x3_ff_fd]
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
