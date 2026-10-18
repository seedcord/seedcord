import { stat } from 'node:fs/promises';
import path from 'node:path';

export function toPosixPath(filePath: string): string {
    return filePath.split(path.sep).join('/');
}

export function posixRelative(from: string, to: string): string {
    return toPosixPath(path.relative(from, to));
}

export async function pathExists(filePath: string): Promise<boolean> {
    try {
        await stat(filePath);
        return true;
    } catch {
        return false;
    }
}

// tidy up relative paths so they work cross-platform
export function normalizeRelativePath(segment: string): string {
    return segment.replace(/^[.][/\\]+/, '').replaceAll('\\', '/');
}
