import * as path from 'node:path';

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

// workerd's node:path is posix. it reads D:/bot as relative
export function workerdPath(hostPath: string): string {
    const forward = hostPath.replaceAll('\\', '/');
    return /^[A-Za-z]:\//.test(forward) ? `/${forward}` : forward;
}
