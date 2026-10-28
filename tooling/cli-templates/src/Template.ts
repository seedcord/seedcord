import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { hasErrorCode, toPosixPath } from '@seedcord/utils/internal';

import { TemplateOutput } from './TemplateOutput';

import type { RenderProject } from './TemplateOutput';

const SHARED_FOLDER_PREFIX = '_';
const PARTIALS_FOLDER = '_partials';
const TEMPLATE_EXTENSION = '.hbs';

export interface TemplateFile {
    // the path inside the template, like handlers/{{pascal name}}.ts
    readonly layout: string;
    readonly source: string;
}

async function unlessMissing<Entry>(read: Promise<Entry[]>): Promise<Entry[]> {
    try {
        return await read;
    } catch (error: unknown) {
        if (hasErrorCode(error, 'ENOENT')) return [];
        throw error;
    }
}

async function filesIn(dir: string): Promise<TemplateFile[]> {
    const paths = await unlessMissing(readdir(dir, { recursive: true }));
    return Promise.all(
        paths
            .filter((path) => path.endsWith(TEMPLATE_EXTENSION))
            .toSorted()
            .map(async (path) => ({
                layout: toPosixPath(path).slice(0, -TEMPLATE_EXTENSION.length),
                source: await readFile(join(dir, path), 'utf8')
            }))
    );
}

export class Template {
    private constructor(
        public readonly name: string,
        public readonly from: string,
        public readonly files: readonly TemplateFile[],
        // keyed by the path inside _partials, like discord/imports
        public readonly partials: ReadonlyMap<string, string>
    ) {}

    public static async readAll(dir: string, from: string): Promise<Template[]> {
        const [entries, partialFiles] = await Promise.all([
            unlessMissing(readdir(dir, { withFileTypes: true })),
            filesIn(join(dir, PARTIALS_FOLDER))
        ]);
        const partials = new Map(partialFiles.map(({ layout, source }) => [layout, source]));
        const folders = entries
            .filter((entry) => entry.isDirectory() && !entry.name.startsWith(SHARED_FOLDER_PREFIX))
            .map((entry) => entry.name)
            .toSorted((a, b) => a.localeCompare(b));
        return Promise.all(
            folders.map(async (name) => new Template(name, from, await filesIn(join(dir, name)), partials))
        );
    }

    public output(name: string, project: RenderProject): TemplateOutput {
        return new TemplateOutput(this, name, project);
    }
}
