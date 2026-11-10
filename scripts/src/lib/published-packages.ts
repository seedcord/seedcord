import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { Workspace } from '#src/lib/Workspace';

export interface PublishedPackage {
    name: string;
    version: string;
}

export const PUBLISHED_FLAGS = {
    published: { type: 'string', describe: 'JSON array of { name, version } objects that published' },
    'published-file': { type: 'string', describe: 'Path to a file holding that JSON array' }
} as const;

export async function readPublished(values: {
    published?: string | undefined;
    'published-file'?: string | undefined;
}): Promise<PublishedPackage[]> {
    const file = values['published-file'];
    const raw = file === undefined ? values.published : await readFile(file, 'utf8');
    if (raw === undefined) throw new Error('--published <json> or --published-file <path> is required');

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new TypeError('--published must be a JSON array of { name, version }');

    return parsed.map((entry: unknown) => {
        const { name, version } = (entry ?? {}) as Partial<Record<keyof PublishedPackage, unknown>>;
        if (typeof name !== 'string' || typeof version !== 'string') {
            throw new TypeError('each published entry needs a string name and version');
        }

        return { name, version };
    });
}

export async function readStatusReleases(workspace: Workspace): Promise<PublishedPackage[]> {
    const file = path.join(workspace.rootDir, '.changeset', 'status.json');
    if (!existsSync(file)) {
        throw new Error(`${file} does not exist. Run \`vp run cs:status\` first, or pass --published.`);
    }

    // justified: changesets writes this file
    const { releases } = JSON.parse(await readFile(file, 'utf8')) as {
        releases: { name: string; newVersion: string }[];
    };
    const isPublic = new Set(workspace.published().map((pkg) => pkg.packageJson.name));

    return releases
        .filter(({ name }) => isPublic.has(name))
        .map(({ name, newVersion }) => ({ name, version: newVersion }));
}
