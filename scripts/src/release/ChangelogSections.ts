type Bucket = 'breaking' | 'minor' | 'patch' | 'dependencies';

const VERSION_START = /(?=^## )/m;
const SECTION_START = /(?=^### )/m;
const ENTRY_START = /(?=^- )/m;
const DEPENDENCY = /^- \S+ \S+ → \S+$/;
const MARKER = '- **BREAKING:** ';

const HEADING: Record<Bucket, string> = {
    breaking: '### 💥 Breaking',
    minor: '### ✨ Minor',
    patch: '### 🩹 Patch',
    dependencies: '### 📦 Updated dependencies'
};

const ORDER: readonly Bucket[] = ['breaking', 'minor', 'patch', 'dependencies'];

// the emoji names are here too, so a second run over an already grouped file reads its own headings
const BUCKET: Record<string, Bucket> = {
    'Major Changes': 'breaking',
    'Minor Changes': 'minor',
    'Patch Changes': 'patch',
    '💥 Breaking': 'breaking',
    '✨ Minor': 'minor',
    '🩹 Patch': 'patch',
    '📦 Updated dependencies': 'dependencies'
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

        return new ChangelogSections(rebuilt.join(''));
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
    for (const section of sections) {
        const name = section.slice(0, section.indexOf('\n')).replace('### ', '').trim();
        const bucket = BUCKET[name];
        if (bucket === undefined) return chunk;

        for (const entry of entriesOf(section)) {
            const [target, text] = classify(entry, bucket);
            buckets.set(target, [...(buckets.get(target) ?? []), text]);
        }
    }

    const blocks = ORDER.filter((bucket) => buckets.has(bucket)).map(
        (bucket) => `${HEADING[bucket]}\n\n${(buckets.get(bucket) ?? []).join('\n')}\n`
    );

    return `${heading}\n\n${blocks.join('\n')}\n`;
}

function entriesOf(section: string): string[] {
    return section
        .slice(section.indexOf('\n') + 1)
        .split(ENTRY_START)
        .map((entry) => entry.replace(/\s+$/, ''))
        .filter((entry) => entry.startsWith('- '));
}

function classify(entry: string, bucket: Bucket): [Bucket, string] {
    if (entry.startsWith(MARKER)) return ['breaking', `- ${entry.slice(MARKER.length)}`];
    if (DEPENDENCY.test(entry)) return ['dependencies', entry];

    return [bucket, entry];
}
