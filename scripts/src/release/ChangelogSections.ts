import {
    bucketOf,
    DEPENDENCIES,
    HEADING,
    headingOf,
    joinEntries,
    NESTED_START,
    ORDER,
    SECTION_START,
    splitEntries,
    VERSION_START
} from '#src/release/changelog-format';

import type { Bucket } from '#src/release/changelog-format';

const DEPENDENCY = /^- \S+ \S+ → \S+$/;
const MARKER = /\*\*BREAKING:\*\* /;

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
    const firstLineEnd = chunk.indexOf('\n');
    if (firstLineEnd === -1) return chunk;

    const heading = chunk.slice(0, firstLineEnd);
    const sections = chunk
        .slice(firstLineEnd + 1)
        .split(SECTION_START)
        .filter((section) => section.trim() !== '');

    const buckets = new Map<Bucket, string[]>();
    const dependencies: string[] = [];

    for (const section of sections) {
        const name = headingOf(section);
        const bucket = bucketOf(name);
        if (bucket === undefined) return chunk;

        const [own, ...nested] = section.slice(section.indexOf('\n') + 1).split(NESTED_START);
        const body = [own ?? '', ...nested.map((part) => part.slice(part.indexOf('\n') + 1))].join('');

        for (const entry of splitEntries(body)) {
            if (DEPENDENCY.test(entry)) {
                dependencies.push(entry);
                continue;
            }

            const breaking = MARKER.test(entry);
            const target = breaking ? 'breaking' : bucket;
            const text = breaking ? entry.replace(MARKER, '') : entry;
            buckets.set(target, [...(buckets.get(target) ?? []), text]);
        }
    }

    const blocks = ORDER.filter((bucket) => buckets.has(bucket) || (bucket === 'patch' && dependencies.length > 0)).map(
        (bucket) => block(bucket, buckets.get(bucket) ?? [], bucket === 'patch' ? dependencies : [])
    );

    return `${heading}\n\n${blocks.join('\n')}\n`;
}

function block(bucket: Bucket, entries: readonly string[], dependencies: readonly string[]): string {
    const own = entries.length > 0 ? `${joinEntries(entries)}\n` : '';
    const nested = dependencies.length > 0 ? `${own ? '\n' : ''}${DEPENDENCIES}\n\n${dependencies.join('\n')}\n` : '';

    return `${HEADING[bucket]}\n\n${own}${nested}`;
}
