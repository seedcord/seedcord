export const ORDER = ['breaking', 'stable', 'minor', 'patch'] as const;
export type Bucket = (typeof ORDER)[number];

const STABLE = /^\d+\.\d+\.\d+$/;

export const VERSION_START = /(?=^## )/m;
export const SECTION_START = /(?=^### )/m;
export const NESTED_START = /(?=^#### )/m;

export const HEADING: Record<Bucket, string> = {
    breaking: '### 💥 Breaking',
    stable: '### 🎉 Stable',
    minor: '### ✨ Minor',
    patch: '### 🩹 Patch'
};

export const DEPENDENCIES = '#### 📦 Seedcord packages';

// changesets writes the plain names. a marked major entry moves to breaking in ChangelogSections
const BUCKET: Record<string, Bucket> = {
    'Major Changes': 'stable',
    'Minor Changes': 'minor',
    'Patch Changes': 'patch',
    '💥 Breaking': 'breaking',
    '🎉 Stable': 'stable',
    '✨ Minor': 'minor',
    '🩹 Patch': 'patch'
};

const ENTRY_START = /(?=^- )/m;

export const MARKER = '**BREAKING:**';

// changesets must open a fix with "Fixed". the other forms predate that rule
export const FIX_OPENER = /^(Fixed|Fix|Fixes|Fixing|fix|fixes|fixing|fixed)\b/;
export const REQUIRED_FIX_OPENER = 'Fixed';

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
