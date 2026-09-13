import { parseChangesetFile } from '@changesets/parse';

const RANK = { patch: 1, minor: 2, major: 3 } as const;

export type Bump = keyof typeof RANK;

export function maxBump(changesets: readonly string[]): Bump | null {
    let top: Bump | null = null;

    for (const body of changesets) {
        for (const { type } of parseChangesetFile(body).releases) {
            if (type === 'none') continue;
            if (top === null || RANK[type] > RANK[top]) top = type;
        }
    }

    return top;
}

export function changesetPathsFromFiles(files: readonly { filename: string; status: string }[]): string[] {
    return files
        .filter((file) => {
            const name = file.filename.split('/').pop() ?? '';
            const touched = file.status === 'added' || file.status === 'modified';
            return file.filename.startsWith('.changeset/') && name.endsWith('.md') && name !== 'README.md' && touched;
        })
        .map((file) => file.filename);
}
