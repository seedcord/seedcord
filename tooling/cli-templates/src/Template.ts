import { readdir, readFile } from 'node:fs/promises';
import { join, posix } from 'node:path';

import { hasErrorCode, toPosixPath } from '@seedcord/utils/internal';

import { TemplateOutput } from './TemplateOutput';

import type { RenderProject } from './TemplateOutput';

const SHARED_FOLDER_PREFIX = '_';
const PARTIALS_FOLDER = '_partials';
const TEMPLATE_EXTENSION = '.hbs';

export interface TemplateFile {
    // inside the templates folder, like Button/handlers/{{pascal name}}.ts.hbs
    readonly path: string;
    // inside its own folder without .hbs, like handlers/{{pascal name}}.ts
    readonly layout: string;
    readonly source: string;
}

const byName = (a: string, b: string): number => a.localeCompare(b);

async function unlessMissing<Entry>(read: Promise<Entry[]>): Promise<Entry[]> {
    try {
        return await read;
    } catch (error: unknown) {
        if (hasErrorCode(error, 'ENOENT')) return [];
        throw error;
    }
}

async function filesIn(dir: string, folder: string): Promise<TemplateFile[]> {
    const paths = await unlessMissing(readdir(join(dir, folder), { recursive: true }));
    return Promise.all(
        paths
            .filter((path) => path.endsWith(TEMPLATE_EXTENSION))
            .toSorted(byName)
            .map(async (path) => {
                const inFolder = toPosixPath(path);
                return {
                    path: posix.join(folder, inFolder),
                    layout: inFolder.slice(0, -TEMPLATE_EXTENSION.length),
                    source: await readFile(join(dir, folder, path), 'utf8')
                };
            })
    );
}

export class Template {
    private constructor(
        public readonly name: string,
        public readonly from: string,
        public readonly files: readonly TemplateFile[],
        // keyed by the path inside _partials without .hbs, like discord/imports
        public readonly partials: ReadonlyMap<string, TemplateFile>
    ) {}

    public static async readAll(dir: string, from: string): Promise<Template[]> {
        const [entries, partialFiles] = await Promise.all([
            unlessMissing(readdir(dir, { withFileTypes: true })),
            filesIn(dir, PARTIALS_FOLDER)
        ]);
        const partials = new Map(partialFiles.map((file) => [file.layout, file]));
        const folders = entries
            .filter((entry) => entry.isDirectory() && !entry.name.startsWith(SHARED_FOLDER_PREFIX))
            .map((entry) => entry.name)
            .toSorted(byName);
        return Promise.all(folders.map(async (name) => new Template(name, from, await filesIn(dir, name), partials)));
    }

    public output(name: string, project: RenderProject): TemplateOutput {
        return new TemplateOutput(this, name, project);
    }
}
