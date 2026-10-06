import { BUILT_FILES_SLOT, type ProjectFiles } from './ProjectFiles';

import type { Plugin } from 'vite';

export const ENTRY_ID = 'seedcord:entry';
const RESOLVED_ENTRY_ID = `\0${ENTRY_ID}`;

export const ENTRY_FILE_NAME = 'index.mjs';

interface EntryOptions {
    files: ProjectFiles;
    entry: string;
    folders: string[];
}

export function isSeedcordEntry(moduleId: string | null | undefined): boolean {
    return moduleId === RESOLVED_ENTRY_ID;
}

// the module and text globs follow isModulePath and isTextPath in @seedcord/utils
function entrySource({ files, entry, folders }: EntryOptions): string {
    const excludes = files.globExcludes();
    const modules = ['/**/*.ts', '/**/*.js', '!/**/*.d.ts', ...excludes];
    const text = ['/**/*', '!/**/*.ts', '!/**/*.js', '!/**/*.map', ...excludes];

    return [
        `${BUILT_FILES_SLOT} = {`,
        '    root: import.meta.dirname,',
        `    folders: ${JSON.stringify(folders)},`,
        `    modules: import.meta.glob(${JSON.stringify(modules)}),`,
        `    text: import.meta.glob(${JSON.stringify(text)}, { query: '?raw', import: 'default' })`,
        '};',
        '',
        `await import(${JSON.stringify(files.keyOf(entry))});`,
        ''
    ].join('\n');
}

// writes the file table that @seedcord/utils reads, then imports the user's entry
export function seedcordEntry(options: EntryOptions): Plugin {
    return {
        name: ENTRY_ID,
        resolveId: (id) => (id === ENTRY_ID ? RESOLVED_ENTRY_ID : undefined),
        load: (id) => (id === RESOLVED_ENTRY_ID ? entrySource(options) : undefined)
    };
}
