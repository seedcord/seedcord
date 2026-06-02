import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { IndexLoader, VersionedDocsEngine } from '@seedcord/docs-engine';
import { cache } from 'react';

// file:// reads the local generated/artifacts tree from disk instead of an HTTP fetch, so SSR
// doesn't issue a request back to itself.
async function protocolFetcher(url: string): Promise<Response> {
    if (!url.startsWith('file://')) {
        return fetch(url);
    }

    try {
        const body = await readFile(fileURLToPath(url), 'utf8');
        return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
    } catch {
        return new Response(null, { status: 404 });
    }
}

const LOCAL_INDEX_URL = pathToFileURL(path.resolve(process.cwd(), '../../generated/artifacts/index.json')).href;
const INDEX_URL = process.env.SEEDCORD_DOCS_INDEX_URL ?? LOCAL_INDEX_URL;

// Per-request via React cache(): the engine carries mutable per-package active-version state and
// must not be shared across requests.
export const getDocsEngine = cache(
    (): Promise<VersionedDocsEngine> =>
        Promise.resolve(new VersionedDocsEngine(new IndexLoader(INDEX_URL, protocolFetcher), protocolFetcher))
);

export type { VersionedDocsEngine };
