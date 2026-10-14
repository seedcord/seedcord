import { BUILT_FILES_KEY, moduleGlobs, textGlobs } from '@seedcord/utils/node/internal';

import type { ProjectFiles } from '#core/project/ProjectFiles';

export const BUILT_FILES_SLOT = `globalThis[Symbol.for(${JSON.stringify(BUILT_FILES_KEY)})]`;

interface BuiltFilesOptions {
    files: ProjectFiles;
    folders: string[];
    rootExpression: string;
    rootKey: string;
    sourcePaths: boolean;
}

export function builtFilesSource({ files, folders, rootExpression, rootKey, sourcePaths }: BuiltFilesOptions): string {
    const excludes = files.globExcludes();
    const modules = [...moduleGlobs('.'), ...excludes];
    const text = [...textGlobs('.'), ...excludes];
    const moduleOptions = { base: rootKey };
    const textOptions = { ...moduleOptions, query: '?raw', import: 'default' };

    return [
        `${BUILT_FILES_SLOT} = {`,
        `    root: ${rootExpression},`,
        `    folders: ${JSON.stringify(folders)},`,
        `    modules: import.meta.glob(${JSON.stringify(modules)}, ${JSON.stringify(moduleOptions)}),`,
        `    text: import.meta.glob(${JSON.stringify(text)}, ${JSON.stringify(textOptions)}),`,
        `    sourcePaths: ${String(sourcePaths)}`,
        '};',
        ''
    ].join('\n');
}
