import { BUILT_FILES_KEY } from '@seedcord/utils/node/internal';

import type { ProjectFiles } from '#core/project/ProjectFiles';

export const BUILT_FILES_SLOT = `globalThis[Symbol.for(${JSON.stringify(BUILT_FILES_KEY)})]`;

interface BuiltFilesOptions {
    files: ProjectFiles;
    folders: string[];
    // a JS expression, evaluated in the generated module
    root: string;
    // the bot's root as vite sees it, like /src
    base: string;
}

// the module and text globs follow isModulePath and isTextPath in @seedcord/utils
export function builtFilesSource({ files, folders, root, base }: BuiltFilesOptions): string {
    const excludes = files.globExcludes();
    const modules = ['./**/*.ts', './**/*.js', '!./**/*.d.ts', ...excludes];
    const text = ['./**/*', '!./**/*.ts', '!./**/*.js', '!./**/*.map', ...excludes];

    return [
        `${BUILT_FILES_SLOT} = {`,
        `    root: ${root},`,
        `    folders: ${JSON.stringify(folders)},`,
        `    modules: import.meta.glob(${JSON.stringify(modules)}, { base: ${JSON.stringify(base)} }),`,
        `    text: import.meta.glob(${JSON.stringify(text)}, { base: ${JSON.stringify(base)}, query: '?raw', import: 'default' })`,
        '};',
        ''
    ].join('\n');
}
