import * as path from 'node:path';

import type * as fs from 'node:fs';

/**
 * Determines if a directory entry is a TypeScript or JavaScript file.
 */
export function isTsOrJsFile(entry: fs.Dirent): boolean {
    return entry.isFile() && isModulePath(entry.name);
}

const MODULE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.jsx', '.mjs'];
const DECLARATION_EXTENSIONS = ['.d.ts', '.d.mts'];
const CODE_AND_MAP_EXTENSIONS = [...MODULE_EXTENSIONS, '.map'];

function endsWithAny(name: string, extensions: string[]): boolean {
    return extensions.some((extension) => name.endsWith(extension));
}

export function isModulePath(file: string): boolean {
    const name = path.basename(file);
    return endsWithAny(name, MODULE_EXTENSIONS) && !endsWithAny(name, DECLARATION_EXTENSIONS);
}

function isSkippedName(name: string): boolean {
    return name.startsWith('.') || name === 'node_modules';
}

// isSkippedName as globs
export const SKIPPED_GLOBS = ['!**/node_modules/**', '!**/.*', '!**/.*/**'];

export function isSkippedUnder(dir: string, file: string): boolean {
    return path.relative(dir, file).split(path.sep).some(isSkippedName);
}

export function isNonCodeFile(dir: string, file: string): boolean {
    const name = path.basename(file);
    return !isSkippedUnder(dir, file) && !endsWithAny(name, CODE_AND_MAP_EXTENSIONS);
}

export function moduleGlobs(base: string): string[] {
    return [
        ...MODULE_EXTENSIONS.map((extension) => `${base}/**/*${extension}`),
        ...DECLARATION_EXTENSIONS.map((extension) => `!${base}/**/*${extension}`)
    ];
}

export function nonCodeGlobs(base: string): string[] {
    return [`${base}/**/*`, ...CODE_AND_MAP_EXTENSIONS.map((extension) => `!${base}/**/*${extension}`)];
}

export function builtExtension(file: string): string {
    return isModulePath(file) ? '.js' : `${path.extname(file)}.js`;
}

// a built bot reports each module by the path of the file it became
export function builtModulePath(key: string): string {
    return key.slice(0, key.length - path.extname(key).length) + builtExtension(key);
}
