import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { IndexLoader } from '#remote/IndexLoader';
import { indexUrlOverride, resolveIndexUrl } from '#src/constants';

export async function fetchFileOrUrl(url: string): Promise<Response> {
    if (!url.startsWith('file://')) return fetch(url);

    try {
        const body = await readFile(fileURLToPath(url), 'utf8');
        return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
    } catch {
        return new Response(null, { status: 404 });
    }
}

// each site runs from apps/<name>, two levels below what pnpm docs:local writes
function localIndexPath(): string {
    return path.resolve(process.cwd(), '../../generated/artifacts/index.json');
}

function workspaceIndexUrl(): string {
    const local = localIndexPath();
    return indexUrlOverride() ?? (existsSync(local) ? pathToFileURL(local).href : resolveIndexUrl());
}

export function workspaceIndexLoader(): IndexLoader {
    return new IndexLoader(workspaceIndexUrl(), fetchFileOrUrl);
}
