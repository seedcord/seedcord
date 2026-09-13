import {
    bucketOf,
    DEPENDENCIES,
    HEADING,
    headingOf,
    MARKER,
    NESTED_START,
    ORDER,
    SECTION_START,
    splitEntries,
    textBeforeFirstEntry,
    VERSION_START
} from '#src/release/changelog-format';

import type { Bucket } from '#src/release/changelog-format';

const DEPENDENCY = /^- `[^`]+` (?:\S+ → \S+|\S+ \(new\))$/;
const NOTE = /^---$/m;
const LEADING_MARKER = `- ${MARKER} `;

export class ChangelogSections {
    constructor(private readonly text: string) {}

    get contents(): string {
        return this.text;
    }

    regrouped(): ChangelogSections {
        const rebuilt = this.text
            .split(VERSION_START)
            .map((chunk) => (chunk.startsWith('## ') ? regroupVersion(chunk) : chunk));

        return new ChangelogSections(rebuilt.join('').replace(/\n+$/, '\n'));
    }
}

function regroupVersion(chunk: string): string {
    const note = NOTE.exec(chunk);
    const head = note ? chunk.slice(0, note.index) : chunk;
    const tail = note ? chunk.slice(note.index) : '';

    const regrouped = regroupHead(head);
    return regrouped === undefined ? chunk : `${regrouped}${tail}`;
}

function regroupHead(head: string): string | undefined {
    const firstLineEnd = head.indexOf('\n');
    if (firstLineEnd === -1) return undefined;

    const sections = head
        .slice(firstLineEnd + 1)
        .split(SECTION_START)
        .filter((section) => section.trim() !== '');

    const buckets = new Map<Bucket, string[]>();
    const dependencies: string[] = [];

    for (const section of sections) {
        const bucket = bucketOf(headingOf(section));
        if (bucket === undefined) return undefined;

        const [own = '', ...nested] = section.slice(section.indexOf('\n') + 1).split(NESTED_START);
        if (textBeforeFirstEntry(own) !== '') return undefined;
        if (nested.some((part) => !part.startsWith(`${DEPENDENCIES}\n`))) return undefined;

        const body = [own, ...nested.map((part) => part.slice(part.indexOf('\n') + 1))].join('');

        for (const entry of splitEntries(body)) {
            if (DEPENDENCY.test(entry)) {
                dependencies.push(entry);
                continue;
            }

            const breaking = entry.startsWith(LEADING_MARKER);
            const text = breaking ? `- ${entry.slice(LEADING_MARKER.length)}` : entry;
            const target = breaking ? 'breaking' : bucket;
            buckets.set(target, [...(buckets.get(target) ?? []), text]);
        }
    }

    const blocks = ORDER.filter((bucket) => buckets.has(bucket) || (bucket === 'patch' && dependencies.length > 0)).map(
        (bucket) => block(bucket, buckets.get(bucket) ?? [], bucket === 'patch' ? dependencies : [])
    );

    return `${head.slice(0, firstLineEnd)}\n\n${blocks.join('\n')}\n`;
}

function block(bucket: Bucket, entries: readonly string[], dependencies: readonly string[]): string {
    const own = entries.length > 0 ? `${joinEntries(entries)}\n` : '';
    const nested = dependencies.length > 0 ? `${own ? '\n' : ''}${DEPENDENCIES}\n\n${dependencies.join('\n')}\n` : '';

    return `${HEADING[bucket]}\n\n${own}${nested}`;
}

// older entries carry continuation paragraphs, and prettier puts a blank line after one
function joinEntries(entries: readonly string[]): string {
    return entries
        .map((entry, index) => (entry.includes('\n') && index < entries.length - 1 ? `${entry}\n` : entry))
        .join('\n');
}
