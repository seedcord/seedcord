export interface HighlightSegment {
    text: string;
    match: boolean;
    code: boolean;
}

// fumadocs wraps every query match in <mark> at query time, over content it stored as markdown
const OPEN = '<mark>';
const CLOSE = '</mark>';
const TICK = '`';
const STAR = '*';

// remark stores an asterisk that follows a backtick as &#x2A;. that splits the bold run around it
const NUMERIC_ENTITY = /&#(x)?([0-9a-f]+);/gi;
const HEX = 16;
const DECIMAL = 10;

function decodeEntities(content: string): string {
    return content.replace(NUMERIC_ENTITY, (whole, hex: string | undefined, digits: string) => {
        const point = Number.parseInt(digits, hex === undefined ? DECIMAL : HEX);
        return Number.isNaN(point) ? whole : String.fromCodePoint(point);
    });
}

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

function runWidth(plain: string, start: number, char: string): number {
    let end = start;
    while (plain[end] === char) end++;
    return end - start;
}

// a span closes on the next run of the same width. a shorter run inside it is content
function closingRun(plain: string, from: number, width: number, char: string): number {
    for (let at = from; at < plain.length; at++) {
        if (plain[at] !== char) continue;

        const run = runWidth(plain, at, char);
        if (run === width) return at;
        at += run - 1;
    }

    return -1;
}

interface Fenced {
    code: boolean[];
    delimiter: boolean[];
}

function codeFlags(plain: string): Fenced {
    const code = Array.from({ length: plain.length }, () => false);
    const delimiter = Array.from({ length: plain.length }, () => false);

    for (let at = 0; at < plain.length; at++) {
        if (plain[at] !== TICK) continue;

        const width = runWidth(plain, at, TICK);
        const close = closingRun(plain, at + width, width, TICK);
        if (close === -1) {
            at += width - 1;
            continue;
        }

        for (let mark = at; mark < close + width; mark++) code[mark] = true;
        for (let mark = 0; mark < width; mark++) {
            delimiter[at + mark] = true;
            delimiter[close + mark] = true;
        }
        at = close + width - 1;
    }

    return { code, delimiter };
}

// emphasis opens on a word or a code span. a glob writes **/ or *. and opens neither
const EMPHASIS_START = /[A-Za-z0-9`]/;

function opensEmphasis(plain: string, after: number): boolean {
    const next = plain[after];
    return next !== undefined && EMPHASIS_START.test(next);
}

function closesEmphasis(plain: string, close: number): boolean {
    const before = plain[close - 1];
    return before !== undefined && before.trim() !== '';
}

function markEmphasis(plain: string, code: readonly boolean[], delimiter: boolean[]): void {
    for (let at = 0; at < plain.length; at++) {
        if (plain[at] !== STAR || code[at] === true) continue;

        const width = runWidth(plain, at, STAR);
        const close = opensEmphasis(plain, at + width) ? closingRun(plain, at + width, width, STAR) : -1;
        if (close === -1 || !closesEmphasis(plain, close)) {
            at += width - 1;
            continue;
        }

        for (let mark = 0; mark < width; mark++) {
            delimiter[at + mark] = true;
            delimiter[close + mark] = true;
        }
        at = close + width - 1;
    }
}

export function highlightSegments(content: string): HighlightSegment[] {
    const { plain, match } = stripMarks(decodeEntities(content));
    const { code, delimiter } = codeFlags(plain);
    markEmphasis(plain, code, delimiter);
    const segments: HighlightSegment[] = [];

    for (let at = 0; at < plain.length; at++) {
        // a backtick that opens or closes a span never renders
        if (delimiter[at] === true) continue;

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
