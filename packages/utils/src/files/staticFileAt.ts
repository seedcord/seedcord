import * as path from 'node:path';

import { isInside, posixRelative } from './paths';

import type { Stats } from 'node:fs';

export const INDEX_PAGE = 'index.html';

type FoundEntry = Pick<Stats, 'isFile' | 'isDirectory' | 'size'>;

type StaticFile = { file: string; size: number } | { redirect: string };

// undefined when the path escapes folder or can't be a file name
function fileAtUrlPath(folder: string, urlPath: string): string | undefined {
    let decoded: string;
    try {
        decoded = decodeURIComponent(urlPath);
    } catch {
        // decodeURIComponent throws on a malformed escape like %E0
        return undefined;
    }
    // node's fs throws on a file name with a NUL byte
    if (decoded.includes('\0')) return undefined;
    const file = path.join(folder, decoded);
    return isInside(folder, file) ? file : undefined;
}

// matches cloudflare's static assets. /uptime and /uptime/index.html redirect to /uptime/
export async function staticFileAt(
    folder: string,
    { pathname, search }: Pick<URL, 'pathname' | 'search'>,
    stat: (file: string) => Promise<FoundEntry | undefined>
): Promise<StaticFile | undefined> {
    const target = fileAtUrlPath(folder, pathname);
    const entry = target === undefined ? undefined : await stat(target);
    if (target === undefined || entry === undefined) return undefined;

    if (entry.isFile()) {
        if (path.basename(target) !== INDEX_PAGE) return { file: target, size: entry.size };
        const parent = posixRelative(folder, path.dirname(target));
        return { redirect: `${encodeURI(parent === '' ? '/' : `/${parent}/`)}${search}` };
    }

    const page = path.join(target, INDEX_PAGE);
    const pageEntry = entry.isDirectory() ? await stat(page) : undefined;
    if (!pageEntry?.isFile()) return undefined;
    return pathname.endsWith('/') ? { file: page, size: pageEntry.size } : { redirect: `${pathname}/${search}` };
}
