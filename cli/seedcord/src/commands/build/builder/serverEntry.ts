import { builtFilesSource } from './builtFiles';

import type { ProjectFiles } from '#core/project/ProjectFiles';
import type { Plugin } from 'vite';

export const ENTRY_ID = 'seedcord:entry';
const RESOLVED_ENTRY_ID = `\0${ENTRY_ID}`;

interface EntryOptions {
    files: ProjectFiles;
    entry: string;
    folders: string[];
}

export function isServerEntry(moduleId: string | null | undefined): boolean {
    return moduleId === RESOLVED_ENTRY_ID;
}

// vite's root is the bot's root on a server build
function entrySource({ files, entry, folders }: EntryOptions): string {
    return [
        builtFilesSource({ files, folders, root: 'import.meta.dirname', base: '/' }),
        `await import(${JSON.stringify(files.keyOf(entry))});`,
        ''
    ].join('\n');
}

export function serverEntry(options: EntryOptions): Plugin {
    return {
        name: ENTRY_ID,
        resolveId: (id) => (id === ENTRY_ID ? RESOLVED_ENTRY_ID : undefined),
        load: (id) => (id === RESOLVED_ENTRY_ID ? entrySource(options) : undefined)
    };
}
