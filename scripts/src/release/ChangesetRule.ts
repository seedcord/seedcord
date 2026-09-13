import { parseChangesetFile } from '@changesets/parse';

export interface Violation {
    file: string;
    reason:
        | 'unknown-package'
        | 'pre-1.0-major'
        | 'breaking-marker'
        | 'too-long'
        | 'banned-punctuation'
        | 'banned-word'
        | 'fix-opener';
    detail: string;
}

const MARKER = '**BREAKING:**';
const MENTION = /\S*BREAKING\S*/g;
const PARAGRAPH = /\n\s*\n/;
const CODE_SPAN = /`[^`]*`/g;
const SENTENCE_END = /[.!?](?=\s|$)/g;
const OPENER = /^(Fix|Fixes|fix|fixes|fixed)\b/;

const PATCH_SENTENCES = 1;
const SENTENCES = 3;

const EM_DASH = '—';
const EN_DASH = '–';
const MARKS = [EM_DASH, EN_DASH, ';'];
const WORDS = [
    'robust',
    'seamless',
    'blazing',
    'effortless',
    'leverage',
    'performant',
    'worth noting',
    'surprisingly',
    'fail-loud'
];

export class ChangesetRule {
    constructor(private readonly published: ReadonlySet<string>) {}

    violations(file: string, text: string): Violation[] {
        const { releases, summary } = parseChangesetFile(text);
        const patchOnly = releases.every((release) => release.type === 'patch');

        return [
            ...this.packageViolations(file, releases),
            ...markerViolations(file, summary),
            ...lengthViolations(file, summary, patchOnly),
            ...punctuationViolations(file, summary),
            ...wordViolations(file, summary),
            ...openerViolations(file, summary)
        ];
    }

    private packageViolations(file: string, releases: readonly { name: string; type: string }[]): Violation[] {
        const found: Violation[] = [];

        for (const { name, type } of releases) {
            if (!this.published.has(name)) {
                found.push({ file, reason: 'unknown-package', detail: name });
                continue;
            }

            if (type === 'major') found.push({ file, reason: 'pre-1.0-major', detail: name });
        }

        return found;
    }
}

function markerViolations(file: string, summary: string): Violation[] {
    return summary.split(PARAGRAPH).flatMap((paragraph) => {
        const rest = paragraph.startsWith(`${MARKER} `) ? paragraph.slice(MARKER.length) : paragraph;

        return [...rest.matchAll(MENTION)].map((match) => ({
            file,
            reason: 'breaking-marker' as const,
            detail: match[0]
        }));
    });
}

function lengthViolations(file: string, summary: string, patchOnly: boolean): Violation[] {
    const cap = patchOnly ? PATCH_SENTENCES : SENTENCES;
    const counted = [...prose(summary).matchAll(SENTENCE_END)].length;

    if (counted <= cap) return [];

    return [{ file, reason: 'too-long', detail: `${String(counted)} sentences` }];
}

function punctuationViolations(file: string, summary: string): Violation[] {
    const text = prose(summary);

    return MARKS.filter((mark) => text.includes(mark)).map((mark) => ({
        file,
        reason: 'banned-punctuation' as const,
        detail: mark
    }));
}

function wordViolations(file: string, summary: string): Violation[] {
    const text = prose(summary);

    return WORDS.filter((word) => new RegExp(String.raw`\b${word}\b`, 'i').test(text)).map((word) => ({
        file,
        reason: 'banned-word' as const,
        detail: word
    }));
}

function openerViolations(file: string, summary: string): Violation[] {
    const opener = OPENER.exec(summary.replace(MARKER, '').trim())?.[1];

    return opener === undefined ? [] : [{ file, reason: 'fix-opener', detail: opener }];
}

function prose(summary: string): string {
    return summary.replaceAll(CODE_SPAN, 'code').replace(MARKER, '');
}
