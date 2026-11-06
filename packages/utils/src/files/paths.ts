import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

// node reads a raw windows path's drive letter as a url protocol, so import() needs a file url
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
