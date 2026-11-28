import { stat } from 'node:fs/promises';
import * as path from 'node:path';

import { decodeUrlPath, fileInFolder, posixRelative } from './paths';

import type { Stats } from 'node:fs';

export const INDEX_PAGE = 'index.html';

type StaticFile = { file: string; size: number } | { redirect: string };

function statIfExists(file: string): Promise<Stats | undefined> {
    return stat(file).catch(() => undefined);
}

// built from the folder on disk. the raw path can start with // and point the browser at another host
function folderRedirect(folder: string, page: string, search: string): StaticFile {
    // the browser reads a ? or # in a folder name as the end of the path. encodeURI keeps both
    const segments = posixRelative(folder, page).split('/').filter(Boolean).map(encodeURIComponent);
    return { redirect: `${segments.length === 0 ? '/' : `/${segments.join('/')}/`}${search}` };
}

// matches cloudflare's static assets. /uptime and /uptime/index.html redirect to /uptime/
export async function staticFileAt(
    folder: string,
    { pathname, search }: Pick<URL, 'pathname' | 'search'>
): Promise<StaticFile | undefined> {
    const decoded = decodeUrlPath(pathname);
    const target = decoded === undefined ? undefined : fileInFolder(folder, decoded);
    const entry = target === undefined ? undefined : await statIfExists(target);
    if (target === undefined || entry === undefined) return undefined;

    if (entry.isFile()) {
        if (path.basename(target) !== INDEX_PAGE) return { file: target, size: entry.size };
        return folderRedirect(folder, path.dirname(target), search);
    }

    const page = path.join(target, INDEX_PAGE);
    const pageEntry = entry.isDirectory() ? await statIfExists(page) : undefined;
    if (!pageEntry?.isFile()) return undefined;
    return pathname.endsWith('/') ? { file: page, size: pageEntry.size } : folderRedirect(folder, target, search);
}
