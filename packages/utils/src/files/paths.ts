import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import { partition } from 'es-toolkit';

// import() needs a file url because node reads a raw windows path's drive letter as a url protocol
export function fileUrl(file: string): string {
    return pathToFileURL(file).href;
}

// true for the folder itself too
export function isInside(folder: string, target: string): boolean {
    const relative = path.relative(folder, target);
    return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export function toPosixPath(nativePath: string): string {
    return nativePath.split(path.sep).join('/');
}

export function posixRelative(from: string, to: string): string {
    return toPosixPath(path.relative(from, to));
}

const GLOB_SYMBOLS = /[()[\]{}*?]/g;

// node's matchesGlob reads a backslash as a separator, and a character class keeps the symbol literal
export function escapeGlob(text: string): string {
    return text.replaceAll(GLOB_SYMBOLS, '[$&]');
}

// the root part matches as plain text, like a [ or a ( in the bot's folder name
export function rootedGlob(root: string, pattern: string): string {
    const base = escapeGlob(toPosixPath(root));
    if (!path.isAbsolute(pattern)) return path.posix.join(base, toPosixPath(pattern));
    return isInside(root, pattern) ? path.posix.join(base, posixRelative(root, pattern)) : toPosixPath(pattern);
}

export function matchesFileGlobs(
    file: string,
    patterns: readonly string[],
    resolve: (pattern: string) => string = (pattern) => pattern
): boolean {
    const [excludes, includes] = partition(patterns, (pattern) => pattern.startsWith('!'));
    // matchesGlob reads a windows separator as an escape
    const matches = (pattern: string): boolean =>
        path.posix.matchesGlob(toPosixPath(file), toPosixPath(resolve(pattern)));
    return includes.some(matches) && !excludes.some((pattern) => matches(pattern.slice(1)));
}

const CODE_EXTENSION = /\.[mc]?[jt]sx?$/;

// bots extend @seedcord/tsconfig. its moduleResolution bundler finds ./bot without the .ts
export function importSpecifier(fromDir: string, file: string): string {
    const specifier = posixRelative(fromDir, file).replace(CODE_EXTENSION, '');
    return specifier.startsWith('../') ? specifier : `./${specifier}`;
}

// workerd's node:path is posix. it reads D:/bot as relative
export function workerdPath(hostPath: string): string {
    const forward = hostPath.replaceAll('\\', '/');
    return /^[A-Za-z]:\//.test(forward) ? `/${forward}` : forward;
}
