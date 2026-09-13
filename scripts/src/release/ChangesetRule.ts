import { parseChangesetFile } from '@changesets/parse';

import { MARKER } from '#src/release/changelog-format';

export interface Violation {
    file: string;
    reason:
        | 'unknown-package'
        | 'pre-1.0-major'
        | 'empty-summary'
        | 'multi-line'
        | 'block-start'
        | 'breaking-marker'
        | 'breaking-patch'
        | 'too-long'
        | 'banned-punctuation'
        | 'banned-word'
        | 'fix-opener';
    detail: string;
}

// an identifier like NON_BREAKING or BREAKING-CHANGE is prose, and _BREAKING:_ is a misspelled marker
const MENTION =
    /\S*(?<![A-Za-z0-9])(?<![A-Za-z0-9][_-])BREAKING(?![A-Za-z0-9])(?![_-][A-Za-z0-9])\S*|\*\*(?!BREAKING)[Bb]reaking\S*/g;
const LEADING_MARKER = `${MARKER} `;
const BLOCK_START = /^(-|\*|\+|\d+\.|#+|>)(?=\s)/;
const CODE_SPAN = /`[^`]*`/g;
const LINK_TARGET = /\]\([^)]*\)/g;
const SENTENCE_END = /[.!?](?=\s|$)/g;
const NOT_A_SENTENCE_END = /\b(?:e\.g|i\.e)\.|\bvs\.|\betc\.(?=\s+[a-z])/g;
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
    // package name to its current version
    constructor(private readonly packages: ReadonlyMap<string, string>) {}

    violations(file: string, text: string): Violation[] {
        const { releases, summary } = parseChangesetFile(text);
        const patches = releases.filter((release) => release.type === 'patch');

        return [
            ...this.packageViolations(file, releases),
            ...(summary.trim() === '' ? [{ file, reason: 'empty-summary' as const, detail: 'no summary' }] : []),
            ...lineViolations(file, summary),
            ...markerViolations(file, summary),
            ...breakingPatchViolations(file, summary, patches),
            ...lengthViolations(file, summary, patches.length === releases.length),
            ...punctuationViolations(file, summary),
            ...wordViolations(file, summary),
            ...openerViolations(file, summary)
        ];
    }

    private packageViolations(file: string, releases: readonly { name: string; type: string }[]): Violation[] {
        const found: Violation[] = [];

        for (const { name, type } of releases) {
            const version = this.packages.get(name);
            if (version === undefined) {
                found.push({ file, reason: 'unknown-package', detail: name });
                continue;
            }

            if (type === 'major' && version.startsWith('0.'))
                found.push({ file, reason: 'pre-1.0-major', detail: name });
        }

        return found;
    }
}

function lineViolations(file: string, summary: string): Violation[] {
    const lines = summary.split('\n').filter((line) => line.trim() !== '').length;

    if (lines > 1) return [{ file, reason: 'multi-line', detail: `${String(lines)} lines` }];

    const start = BLOCK_START.exec(summary.trim())?.[1];
    return start === undefined ? [] : [{ file, reason: 'block-start', detail: start }];
}

function markerViolations(file: string, summary: string): Violation[] {
    const spoken = summary.replaceAll(CODE_SPAN, 'code').replaceAll(LINK_TARGET, '](link)');
    const rest = spoken.startsWith(LEADING_MARKER) ? spoken.slice(LEADING_MARKER.length) : spoken;

    return [...rest.matchAll(MENTION)].map((match) => ({ file, reason: 'breaking-marker', detail: match[0] }));
}

// a breaking change needs at least a minor bump
function breakingPatchViolations(file: string, summary: string, patches: readonly { name: string }[]): Violation[] {
    if (patches.length === 0 || !summary.startsWith(LEADING_MARKER)) return [];

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
