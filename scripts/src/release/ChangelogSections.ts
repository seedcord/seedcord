type Bucket = 'breaking' | 'minor' | 'patch';

const VERSION_START = /(?=^## )/m;
const SECTION_START = /(?=^### )/m;
const NESTED_START = /(?=^#### )/m;
const ENTRY_START = /(?=^- )/m;
const DEPENDENCY = /^- \S+ \S+ → \S+$/;
const MARKER = /\*\*BREAKING:\*\* /;

const DEPENDENCIES = '#### 📦 Seedcord packages';

const HEADING: Record<Bucket, string> = {
    breaking: '### 💥 Breaking',
    minor: '### ✨ Minor',
    patch: '### 🩹 Patch'
};

const ORDER: readonly Bucket[] = ['breaking', 'minor', 'patch'];

// the emoji names are here too, so a second run over an already grouped file reads its own headings
const BUCKET: Record<string, Bucket> = {
    'Major Changes': 'breaking',
    'Minor Changes': 'minor',
    'Patch Changes': 'patch',
    '💥 Breaking': 'breaking',
    '✨ Minor': 'minor',
    '🩹 Patch': 'patch',
    '📦 Updated dependencies': 'patch',
    '📦 Seedcord packages': 'patch'
};

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
        const name = section.slice(0, section.indexOf('\n')).replace('### ', '').trim();
        const bucket = BUCKET[name];
        if (bucket === undefined) return chunk;

        for (const entry of entriesOf(section)) {
            if (DEPENDENCY.test(entry) || name === '📦 Updated dependencies') {
                dependencies.push(entry);
                continue;
            }

            const [target, text] = classify(entry, bucket);
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

// prettier puts a blank line between a continuation paragraph and the entry after it
function joinEntries(entries: readonly string[]): string {
    return entries
        .map((entry, index) => (entry.includes('\n') && index < entries.length - 1 ? `${entry}\n` : entry))
        .join('\n');
}

function entriesOf(section: string): string[] {
    return section
        .slice(section.indexOf('\n') + 1)
        .split(NESTED_START)
        .flatMap((part) => part.split(ENTRY_START))
        .map((entry) => entry.replace(/\s+$/, ''))
        .filter((entry) => entry.startsWith('- '));
}

function classify(entry: string, bucket: Bucket): [Bucket, string] {
    if (MARKER.test(entry)) return ['breaking', entry.replace(MARKER, '')];

    return [bucket, entry];
}
