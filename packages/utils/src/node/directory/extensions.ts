import * as path from 'node:path';

import type * as fs from 'node:fs';

/**
 * Determines if a directory entry is a TypeScript or JavaScript file.
 */
export function isTsOrJsFile(entry: fs.Dirent): boolean {
    return entry.isFile() && isModulePath(entry.name);
}

const MODULE_EXTENSIONS = ['.ts', '.js'];
const DECLARATION_EXTENSION = '.d.ts';
const NOT_TEXT_EXTENSIONS = [...MODULE_EXTENSIONS, '.map'];

export function isModulePath(file: string): boolean {
    const name = path.basename(file);
    return MODULE_EXTENSIONS.some((extension) => name.endsWith(extension)) && !name.endsWith(DECLARATION_EXTENSION);
}

export function isHidden(dir: string, file: string): boolean {
    return path
        .relative(dir, file)
        .split(path.sep)
        .some((part) => part.startsWith('.'));
}

export function isTextPath(dir: string, file: string): boolean {
    const name = path.basename(file);
    return !isHidden(dir, file) && !NOT_TEXT_EXTENSIONS.some((extension) => name.endsWith(extension));
}

export function moduleGlobs(base: string): string[] {
    return [
        ...MODULE_EXTENSIONS.map((extension) => `${base}/**/*${extension}`),
        `!${base}/**/*${DECLARATION_EXTENSION}`
    ];
}

export function textGlobs(base: string): string[] {
    return [`${base}/**/*`, ...NOT_TEXT_EXTENSIONS.map((extension) => `!${base}/**/*${extension}`)];
}

// a built bot reports each module by the path of the file it became
export function builtModulePath(key: string): string {
    return key.replace(/\.ts$/, '.js');
}
