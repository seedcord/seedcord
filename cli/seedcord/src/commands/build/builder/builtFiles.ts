import { BUILT_FILES_KEY } from '@seedcord/utils/node/internal';

import type { ProjectFiles } from '#core/project/ProjectFiles';

export const BUILT_FILES_SLOT = `globalThis[Symbol.for(${JSON.stringify(BUILT_FILES_KEY)})]`;

interface BuiltFilesOptions {
    files: ProjectFiles;
    folders: string[];
    rootExpression: string;
    // the bot's root as vite sees it, like /src
    base: string;
}

// the module and text globs follow isModulePath and isTextPath in @seedcord/utils
export function builtFilesSource({ files, folders, rootExpression, base }: BuiltFilesOptions): string {
    const excludes = files.globExcludes();
    const modules = ['./**/*.ts', './**/*.js', '!./**/*.d.ts', ...excludes];
    const text = ['./**/*', '!./**/*.ts', '!./**/*.js', '!./**/*.map', ...excludes];
    const textOptions = { base, query: '?raw', import: 'default' };

    return [
        `${BUILT_FILES_SLOT} = {`,
        `    root: ${rootExpression},`,
        `    folders: ${JSON.stringify(folders)},`,
        `    modules: import.meta.glob(${JSON.stringify(modules)}, ${JSON.stringify({ base })}),`,
        `    text: import.meta.glob(${JSON.stringify(text)}, ${JSON.stringify(textOptions)})`,
        '};',
        ''
    ].join('\n');
}
