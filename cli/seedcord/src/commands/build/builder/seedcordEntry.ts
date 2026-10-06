import { relative, sep } from 'node:path';

import { BUILT_FILES_KEY } from '@seedcord/utils/node/internal';

import type { Plugin } from 'vite';

export const ENTRY_ID = 'seedcord:entry';
const RESOLVED_ENTRY_ID = `\0${ENTRY_ID}`;

export const ENTRY_FILE_NAME = 'index.mjs';

interface EntryOptions {
    root: string;
    entry: string;
    folders: string[];
    excludes: string[];
}

export function isSeedcordEntry(moduleId: string | null | undefined): boolean {
    return moduleId === RESOLVED_ENTRY_ID;
}

// mirrors isModulePath and isTextPath in @seedcord/utils
function entrySource({ root, entry, folders, excludes }: EntryOptions): string {
    const modules = ['/**/*.ts', '!/**/*.d.ts', ...excludes];
    const text = ['/**/*', '!/**/*.ts', '!/**/*.js', '!/**/*.map', ...excludes];
    const userEntry = `/${relative(root, entry).split(sep).join('/')}`;

    return [
        `globalThis[Symbol.for(${JSON.stringify(BUILT_FILES_KEY)})] = {`,
        '    root: import.meta.dirname,',
        `    folders: ${JSON.stringify(folders)},`,
        `    modules: import.meta.glob(${JSON.stringify(modules)}),`,
        `    text: import.meta.glob(${JSON.stringify(text)}, { query: '?raw', import: 'default' })`,
        '};',
        '',
        `await import(${JSON.stringify(userEntry)});`,
        ''
    ].join('\n');
}

// the built bot's entry: hands utils the file table, then runs the user's entry
export function seedcordEntry(options: EntryOptions): Plugin {
    return {
        name: ENTRY_ID,
        resolveId: (id) => (id === ENTRY_ID ? RESOLVED_ENTRY_ID : undefined),
        load: (id) => (id === RESOLVED_ENTRY_ID ? entrySource(options) : undefined)
    };
}
