import { readFile } from 'node:fs/promises';

import { BOT_FILES_KEY, BUILT_FILES_READY_KEY, encodeFile } from '@seedcord/utils/node/internal';

import type { ProjectFiles } from '#core/project/ProjectFiles';
import type { Plugin } from 'vite';

export const BOT_FILES_SLOT = `globalThis[Symbol.for(${JSON.stringify(BOT_FILES_KEY)})]`;

export const PLACEHOLDER_ROOT = '/bot';

const LISTED_FILE_QUERY = '?seedcord-file';

export function isListedFileId(moduleId: string): boolean {
    return moduleId.endsWith(LISTED_FILE_QUERY);
}

// turns each listed file into a module whose default export is an EncodedFile
export function loadListedFiles(): Plugin {
    return {
        name: 'seedcord:listed-files',
        // vite's asset plugin otherwise claims a .png or .ttf and returns its url
        enforce: 'pre',
        async load(id) {
            if (!isListedFileId(id)) return undefined;
            const file = id.slice(0, -LISTED_FILE_QUERY.length);
            this.addWatchFile(file);
            return `export default ${JSON.stringify(encodeFile(await readFile(file)))};\n`;
        }
    };
}

// an entry that registers the built files needs the plugin that loads them
export type EntryPlugins = [entry: Plugin, listedFiles: Plugin];

interface BuiltFilesOptions {
    files: ProjectFiles;
    folders: string[];
    rootExpression: string;
    rootKey: string;
    sourcePaths: boolean;
    configFile?: string;
}

export function builtFilesSource({
    files,
    folders,
    rootExpression,
    rootKey,
    sourcePaths,
    configFile
}: BuiltFilesOptions): string {
    const moduleOptions = { base: rootKey };
    const fileOptions = { ...moduleOptions, query: LISTED_FILE_QUERY, import: 'default' };

    return [
        `${BOT_FILES_SLOT} = {`,
        "    kind: 'built',",
        `    root: ${rootExpression},`,
        `    listed: ${JSON.stringify(files.listedKeys())},`,
        `    folders: ${JSON.stringify(folders)},`,
        `    modules: import.meta.glob(${JSON.stringify(files.moduleGlobs())}, ${JSON.stringify(moduleOptions)}),`,
        `    files: import.meta.glob(${JSON.stringify(files.listedFileGlobs())}, ${JSON.stringify(fileOptions)}),`,
        `    sourcePaths: ${String(sourcePaths)},`,
        ...(configFile === undefined ? [] : [`    configFile: ${JSON.stringify(configFile)},`]),
        '};',
        `globalThis[Symbol.for(${JSON.stringify(BUILT_FILES_READY_KEY)})]?.();`,
        ''
    ].join('\n');
}
