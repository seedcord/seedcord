import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

// import() needs a file url because node reads a raw windows path's drive letter as a url protocol
export function fileUrl(file: string): string {
    return pathToFileURL(file).href;
}

// true for the folder itself too
export function isInside(folder: string, target: string): boolean {
    const relative = path.relative(folder, target);
    return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

// importFiles and readFiles hand files over in this order on disk and in a built bot
export function comparePaths(a: string, b: string): number {
    if (a === b) return 0;
    return a < b ? -1 : 1;
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

const DRIVE_ROOT = /^[A-Za-z]:\//;

// workerd's node:path is posix. it reads D:/bot as relative
export function workerdPath(hostPath: string): string {
    const forward = hostPath.replaceAll('\\', '/');
    return DRIVE_ROOT.test(forward) ? `/${forward}` : forward;
}

// the reverse of workerdPath. vite's /@fs/ urls carry a windows path as /D:/bot too
export function fromWorkerdPath(slashed: string): string {
    const rest = slashed.slice(1);
    return DRIVE_ROOT.test(rest) ? rest : slashed;
}

// decodeURIComponent throws on a malformed escape like %E0. node's fs throws on a NUL byte
export function decodeUrlPath(urlPath: string): string | undefined {
    let decoded: string;
    try {
        decoded = decodeURIComponent(urlPath);
    } catch {
        return undefined;
    }
    return decoded.includes('\0') ? undefined : decoded;
}

// a url path with .. would otherwise reach the bot's source from a public folder
export function fileInFolder(folder: string, decodedPath: string): string | undefined {
    const file = path.join(folder, decodedPath);
    return isInside(folder, file) ? file : undefined;
}
