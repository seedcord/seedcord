import { readFile } from 'node:fs/promises';

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
