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
    // imports every file up front and wraps it as a loader
    eager?: boolean;
}

const AS_LOADERS =
    'const asLoaders = (imported) => Object.fromEntries(Object.entries(imported).map(([key, value]) => [key, () => Promise.resolve(value)]));';

function glob(patterns: string[], options: Record<string, unknown>, eager: boolean): string {
    if (!eager) return `import.meta.glob(${JSON.stringify(patterns)}, ${JSON.stringify(options)})`;
    return `asLoaders(import.meta.glob(${JSON.stringify(patterns)}, ${JSON.stringify({ ...options, eager })}))`;
}

// the module and text globs follow isModulePath and isTextPath in @seedcord/utils
export function builtFilesSource({ files, folders, root, base, eager = false }: BuiltFilesOptions): string {
    const excludes = files.globExcludes();
    const modules = ['./**/*.ts', './**/*.js', '!./**/*.d.ts', ...excludes];
    const text = ['./**/*', '!./**/*.ts', '!./**/*.js', '!./**/*.map', ...excludes];

    return [
        ...(eager ? [AS_LOADERS] : []),
        `${BUILT_FILES_SLOT} = {`,
        `    root: ${root},`,
        `    folders: ${JSON.stringify(folders)},`,
        `    modules: ${glob(modules, { base }, eager)},`,
        `    text: ${glob(text, { base, query: '?raw', import: 'default' }, eager)}`,
        '};',
        ''
    ].join('\n');
}
