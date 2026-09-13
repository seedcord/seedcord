import { parseChangesetFile } from '@changesets/parse';

import { carriesMarker, MARKER } from '#src/release/changelog-format';

export interface Violation {
    file: string;
    reason:
        | 'unknown-package'
        | 'pre-1.0-major'
        | 'empty-summary'
        | 'breaking-marker'
        | 'breaking-patch'
        | 'too-long'
        | 'banned-punctuation'
        | 'banned-word'
        | 'fix-opener';
    detail: string;
}

const MENTION = /\S*(?<![A-Za-z_])BREAKING(?![A-Za-z_])\S*|\*\*(?!BREAKING)[Bb]reaking\S*/g;
const LEADING_MARKER = /^\s*(?:- )?\*\*BREAKING:\*\* /;
const CODE_SPAN = /`[^`]*`/g;
const SENTENCE_END = /[.!?](?=\s|$)/g;
const NOT_A_SENTENCE_END = /\b(?:e\.g|i\.e)\.|\betc\.(?=\s+[a-z])|^\s*\d+\.(?=\s)/gm;
const OPENER = /^(Fix|Fixes|Fixing|fix|fixes|fixing|fixed)\b/;
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
    constructor(private readonly packages: ReadonlySet<string>) {}

    violations(file: string, text: string): Violation[] {
        const { releases, summary } = parseChangesetFile(text);
        const patchOnly = releases.every((release) => release.type === 'patch');

        return [
            ...this.packageViolations(file, releases),
            ...(summary.trim() === '' ? [{ file, reason: 'empty-summary' as const, detail: 'no summary' }] : []),
            ...markerViolations(file, summary),
            ...breakingPatchViolations(file, summary, patchOnly ? releases : []),
            ...lengthViolations(file, summary, patchOnly),
            ...punctuationViolations(file, summary),
            ...wordViolations(file, summary),
            ...openerViolations(file, summary)
        ];
    }

    private packageViolations(file: string, releases: readonly { name: string; type: string }[]): Violation[] {
        const found: Violation[] = [];

        for (const { name, type } of releases) {
            if (!this.packages.has(name)) {
                found.push({ file, reason: 'unknown-package', detail: name });
                continue;
            }

            if (type === 'major') found.push({ file, reason: 'pre-1.0-major', detail: name });
        }

        return found;
    }
}

function markerViolations(file: string, summary: string): Violation[] {
    return summary.split('\n').flatMap((line) => {
        const rest = line.replaceAll(CODE_SPAN, 'code').replace(LEADING_MARKER, '');

        return [...rest.matchAll(MENTION)].map((match) => ({
            file,
            reason: 'breaking-marker' as const,
            detail: match[0]
        }));
    });
}

// pre-1.0, a breaking change ships as a minor
function breakingPatchViolations(file: string, summary: string, patches: readonly { name: string }[]): Violation[] {
    if (patches.length === 0 || !carriesMarker(summary.replaceAll(CODE_SPAN, 'code'))) return [];

    return [{ file, reason: 'breaking-patch', detail: patches.map((one) => one.name).join(', ') }];
}

function lengthViolations(file: string, summary: string, patchOnly: boolean): Violation[] {
    const cap = patchOnly ? PATCH_SENTENCES : SENTENCES;
    const counted = [...prose(summary).replaceAll(NOT_A_SENTENCE_END, '').matchAll(SENTENCE_END)].length;

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
