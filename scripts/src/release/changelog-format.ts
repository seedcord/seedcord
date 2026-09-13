export type Bucket = 'breaking' | 'minor' | 'patch';

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

// the emoji names are here too, so a second pass over an already grouped file reads its own headings
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

const ENTRY_START = /(?=^- )/m;

export function headingOf(section: string): string {
    return section.slice(0, section.indexOf('\n')).replace('### ', '').trim();
}

export function bucketOf(heading: string): Bucket | undefined {
    return BUCKET[heading];
}

/** Splits a section body into its `- ` entries, each trimmed of trailing blank lines. */
export function splitEntries(body: string): string[] {
    return body
        .split(ENTRY_START)
        .map((entry) => entry.replace(/\s+$/, ''))
        .filter((entry) => entry.startsWith('- '));
}

/** The part of a section above its nested block. */
export function ownBody(section: string): string {
    return (section.split(NESTED_START)[0] ?? '').slice(section.indexOf('\n') + 1);
}
