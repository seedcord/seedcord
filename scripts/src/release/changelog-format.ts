export type Bucket = 'breaking' | 'minor' | 'patch';

const STABLE = /^\d+\.\d+\.\d+$/;

export const VERSION_START = /(?=^## )/m;
export const SECTION_START = /(?=^### )/m;
export const NESTED_START = /(?=^#### )/m;

export const HEADING: Record<Bucket, string> = {
    breaking: '### 💥 Breaking',
    minor: '### ✨ Minor',
    patch: '### 🩹 Patch'
};

export const DEPENDENCIES = '#### 📦 Seedcord packages';

export const ORDER: readonly Bucket[] = ['breaking', 'minor', 'patch'];

// changesets writes the plain names
const BUCKET: Record<string, Bucket> = {
    'Major Changes': 'breaking',
    'Minor Changes': 'minor',
    'Patch Changes': 'patch',
    '💥 Breaking': 'breaking',
    '✨ Minor': 'minor',
    '🩹 Patch': 'patch'
};

const ENTRY_START = /(?=^- )/m;

export const MARKER = '**BREAKING:**';

export function isStable(version: string): boolean {
    return STABLE.test(version);
}

export function textBeforeFirstEntry(body: string): string {
    return (body.split(ENTRY_START)[0] ?? '').trim();
}

export function headingOf(section: string): string {
    return section.slice(0, section.indexOf('\n')).replace('### ', '').trim();
}

export function bucketOf(heading: string): Bucket | undefined {
    return BUCKET[heading];
}

export function splitEntries(body: string): string[] {
    return body
        .split(ENTRY_START)
        .map((entry) => entry.replace(/\s+$/, ''))
        .filter((entry) => entry.startsWith('- '));
}

export function bodyWithoutNested(section: string): string {
    return (section.split(NESTED_START)[0] ?? '').slice(section.indexOf('\n') + 1);
}
