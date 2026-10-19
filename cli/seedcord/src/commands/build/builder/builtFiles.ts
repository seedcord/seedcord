import { BOT_FILES_KEY, BUILT_FILES_READY_KEY } from '@seedcord/utils/node/internal';

import type { ProjectFiles } from '#core/project/ProjectFiles';

export const BOT_FILES_SLOT = `globalThis[Symbol.for(${JSON.stringify(BOT_FILES_KEY)})]`;

export const PLACEHOLDER_ROOT = '/bot';

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
    const modules = files.moduleGlobs();
    const text = files.textGlobs();
    const moduleOptions = { base: rootKey };
    const textOptions = { ...moduleOptions, query: '?raw', import: 'default' };

    return [
        `${BOT_FILES_SLOT} = {`,
        "    kind: 'built',",
        `    root: ${rootExpression},`,
        `    folders: ${JSON.stringify(folders)},`,
        `    modules: import.meta.glob(${JSON.stringify(modules)}, ${JSON.stringify(moduleOptions)}),`,
        `    text: import.meta.glob(${JSON.stringify(text)}, ${JSON.stringify(textOptions)}),`,
        `    sourcePaths: ${String(sourcePaths)},`,
        ...(configFile === undefined ? [] : [`    configFile: ${JSON.stringify(configFile)},`]),
        '};',
        `globalThis[Symbol.for(${JSON.stringify(BUILT_FILES_READY_KEY)})]?.();`,
        ''
    ].join('\n');
}
