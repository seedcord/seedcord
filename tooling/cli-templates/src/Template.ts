import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { hasErrorCode, toPosixPath } from '@seedcord/utils/internal';

import { TemplateOutput } from './TemplateOutput';

import type { RenderProject } from './TemplateOutput';
import type { Dirent } from 'node:fs';

const SHARED_FOLDER_PREFIX = '_';
const TEMPLATE_EXTENSION = '.hbs';

export interface TemplateFile {
    // the path inside the template, like handlers/{{pascal name}}.ts
    readonly layout: string;
    readonly source: string;
}

async function entriesOf(dir: string): Promise<Dirent[]> {
    try {
        return await readdir(dir, { withFileTypes: true });
    } catch (error: unknown) {
        if (hasErrorCode(error, 'ENOENT')) return [];
        throw error;
    }
}

async function filesIn(dir: string): Promise<TemplateFile[]> {
    const paths = await readdir(dir, { recursive: true });
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
        private readonly files: readonly TemplateFile[]
    ) {}

    public static async readAll(dir: string, from: string): Promise<Template[]> {
        const entries = await entriesOf(dir);
        const folders = entries
            .filter((entry) => entry.isDirectory() && !entry.name.startsWith(SHARED_FOLDER_PREFIX))
            .map((entry) => entry.name)
            .toSorted((a, b) => a.localeCompare(b));
        return Promise.all(folders.map(async (name) => new Template(name, from, await filesIn(join(dir, name)))));
    }

    public output(name: string, project: RenderProject): TemplateOutput {
        return new TemplateOutput(this.files, name, project);
    }
}
