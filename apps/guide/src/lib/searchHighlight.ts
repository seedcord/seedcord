export interface HighlightSegment {
    text: string;
    match: boolean;
    code: boolean;
}

// fumadocs wraps every query match in <mark> at query time, over content it stored as markdown
const OPEN = '<mark>';
const CLOSE = '</mark>';
const TICK = '`';

interface Marked {
    plain: string;
    match: boolean[];
}

// fumadocs can mark a backtick, straddling the code span around it
function stripMarks(content: string): Marked {
    let plain = '';
    const match: boolean[] = [];
    let inside = false;

    for (let read = 0; read < content.length; read++) {
        if (content.startsWith(OPEN, read)) {
            inside = true;
            read += OPEN.length - 1;
            continue;
        }
        if (content.startsWith(CLOSE, read)) {
            inside = false;
            read += CLOSE.length - 1;
            continue;
        }
        plain += content[read];
        match.push(inside);
    }

    return { plain, match };
}

function codeFlags(plain: string): boolean[] {
    const code = Array.from({ length: plain.length }, () => false);

    for (let open = plain.indexOf(TICK); open !== -1; open = plain.indexOf(TICK, open + 1)) {
        const close = plain.indexOf(TICK, open + 1);
        if (close === -1) break;
        for (let at = open; at <= close; at++) code[at] = true;
        open = close;
    }

    return code;
}

export function highlightSegments(content: string): HighlightSegment[] {
    const { plain, match } = stripMarks(content);
    const code = codeFlags(plain);
    const segments: HighlightSegment[] = [];

    for (let at = 0; at < plain.length; at++) {
        // a backtick delimits an inline span and never renders
        if (code[at] === true && plain[at] === TICK) continue;

        const last = segments.at(-1);
        const same = last !== undefined && last.match === match[at] && last.code === code[at];
        if (same && last !== undefined) last.text += plain[at];
        else segments.push({ text: plain[at] ?? '', match: match[at] ?? false, code: code[at] ?? false });
    }

    if (segments.length === 0) segments.push({ text: '', match: false, code: false });
    return segments;
}

/** Cuts the flat result list after `limit` pages, keeping each page's own rows with it. */
export function firstPages<T extends { type: string }>(results: readonly T[], limit: number): T[] {
    let pages = 0;

    return results.filter((result) => {
        if (result.type === 'page') pages += 1;
        return pages <= limit;
    });
}

const ELLIPSIS = '…';

function lengthOf(segments: readonly HighlightSegment[]): number {
    return segments.reduce((total, segment) => total + segment.text.length, 0);
}

/** Trims a result to a window around its first match. Cutting from the start would hide the match. */
export function matchWindow(segments: readonly HighlightSegment[], lead: number, width: number): HighlightSegment[] {
    const first = segments.findIndex((segment) => segment.match);
    if (first === -1 || lengthOf(segments) <= width) return [...segments];

    const before = segments.slice(0, first);
    const skip = Math.max(0, lengthOf(before) - lead);
    const windowed: HighlightSegment[] = [];
    let dropped = 0;
    let kept = 0;

    for (const segment of segments) {
        if (dropped + segment.text.length <= skip) {
            dropped += segment.text.length;
            continue;
        }
        const from = Math.max(0, skip - dropped);
        dropped += segment.text.length;

        const text = segment.text.slice(from, from + Math.max(0, width - kept));
        if (text !== '') windowed.push({ ...segment, text });
        kept += text.length;
        if (kept >= width) break;
    }

    const head = windowed[0];
    if (skip > 0 && head) head.text = `${ELLIPSIS}${head.text}`;
    return windowed;
}
