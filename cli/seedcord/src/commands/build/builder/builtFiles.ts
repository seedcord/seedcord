import { readFile } from 'node:fs/promises';

import { BOT_FILES_KEY, BUILT_FILES_READY_KEY, encodeFile, withoutQuery } from '@seedcord/utils/internal';

import type { BotLayout } from '@seedcord/utils/internal';
import type { Plugin } from 'vite';

export const BOT_FILES_SLOT = `globalThis[Symbol.for(${JSON.stringify(BOT_FILES_KEY)})]`;

export const PLACEHOLDER_ROOT = '/bot';

const LISTED_FILE_QUERY = '?seedcord-file';
const LISTED_FILE_PREFIX = '\0seedcord-file:';

// vite's css, json and asset plugins transform any id that ends in .css, .json or .png. this id ends in a quote
function listedFileId(file: string): string {
    return `${LISTED_FILE_PREFIX}${JSON.stringify(file)}`;
}

export function isListedFileId(moduleId: string): boolean {
    return moduleId.startsWith(LISTED_FILE_PREFIX);
}

export function listedFileOf(moduleId: string): string {
    // justified: listedFileId wrote this part with JSON.stringify of a path
    return JSON.parse(moduleId.slice(LISTED_FILE_PREFIX.length)) as string;
}

// turns each listed file into a module whose default export is an EncodedFile
export function loadListedFiles(): Plugin {
    return {
        name: 'seedcord:listed-files',
        enforce: 'pre',
        async resolveId(source, importer) {
            if (!source.endsWith(LISTED_FILE_QUERY)) return undefined;
            // cloudflare's plugin turns a .txt or .bin import into a text or data module unless the query is still on
            const resolved = await this.resolve(source, importer, { skipSelf: true });
            return resolved && listedFileId(withoutQuery(resolved.id));
        },
        async load(id) {
            if (!isListedFileId(id)) return undefined;
            const file = listedFileOf(id);
            this.addWatchFile(file);
            return `export default ${JSON.stringify(encodeFile(await readFile(file)))};\n`;
        }
    };
}

export type EntryPlugins = [entry: Plugin, listedFiles: Plugin];

interface BuiltFilesOptions {
    layout: BotLayout;
    folders: string[];
    rootExpression: string;
    rootKey: string;
    sourcePaths: boolean;
    configFile?: string;
}

export function builtFilesSource({
    layout,
    folders,
    rootExpression,
    rootKey,
    sourcePaths,
    configFile
}: BuiltFilesOptions): string {
    const moduleOptions = { base: rootKey };
    const fileOptions = { ...moduleOptions, query: LISTED_FILE_QUERY, import: 'default' };
    const { listed, skippedFolders } = layout.bundledData();

    return [
        `${BOT_FILES_SLOT} = {`,
        "    kind: 'built',",
        `    root: ${rootExpression},`,
        `    listed: ${JSON.stringify(listed)},`,
        `    skippedFolders: ${JSON.stringify(skippedFolders)},`,
        `    folders: ${JSON.stringify(folders)},`,
        `    modules: import.meta.glob(${JSON.stringify(layout.moduleGlobs())}, ${JSON.stringify(moduleOptions)}),`,
        `    listedFiles: import.meta.glob(${JSON.stringify(layout.listedFileGlobs())}, ${JSON.stringify(fileOptions)}),`,
        `    sourcePaths: ${String(sourcePaths)},`,
        ...(configFile === undefined ? [] : [`    configFile: ${JSON.stringify(configFile)},`]),
        '};',
        `globalThis[Symbol.for(${JSON.stringify(BUILT_FILES_READY_KEY)})]?.();`,
        ''
    ].join('\n');
}
