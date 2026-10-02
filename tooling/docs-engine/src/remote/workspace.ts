import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { IndexLoader } from '#remote/IndexLoader';

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
function localIndexUrl(): string {
    return pathToFileURL(path.resolve(process.cwd(), '../../generated/artifacts/index.json')).href;
}

export function workspaceIndexLoader(): IndexLoader {
    return new IndexLoader(process.env.SEEDCORD_DOCS_INDEX_URL ?? localIndexUrl(), fetchFileOrUrl);
}
