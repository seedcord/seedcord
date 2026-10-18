import { builtFilesSource } from './builtFiles';

import type { ProjectFiles } from '#core/project/ProjectFiles';
import type { Plugin } from 'vite';

export const ENTRY_ID = 'seedcord:entry';
const RESOLVED_ENTRY_ID = `\0${ENTRY_ID}`;

interface EntryOptions {
    files: ProjectFiles;
    folders: string[];
    entryKey: string;
    rootKey: string;
    configFile: string;
}

export function isServerEntry(moduleId: string | null | undefined): boolean {
    return moduleId === RESOLVED_ENTRY_ID;
}

function entrySource({ entryKey, ...builtFiles }: EntryOptions): string {
    return [
        builtFilesSource({ ...builtFiles, rootExpression: 'import.meta.dirname', sourcePaths: false }),
        `await import(${JSON.stringify(entryKey)});`,
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
