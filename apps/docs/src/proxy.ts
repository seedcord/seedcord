import { DEFAULT_VERSION, replacementVersion } from '@seedcord/docs-engine';
import { NextResponse } from 'next/server';

import { createIndexLoader } from '#lib/docs/engine';

import type { IndexJson } from '@seedcord/docs-engine';
import type { NextRequest } from 'next/server';

// matches revalidate on the docs home page
const INDEX_TTL_MS = 300_000;
// the cdn answers in well under a second
const INDEX_WAIT_MS = 3000;
const PERMANENT_REDIRECT = 308;
// next.config.ts rewrites these onto a package overview's markdown twin and og card
const TWIN_EXTENSION = /\.(md|png)$/;

interface CachedIndex {
    index: Promise<IndexJson>;
    expiresAt: number;
}

// the standalone node server keeps this module loaded between requests
let cached: CachedIndex | undefined;

function forget(entry: CachedIndex): void {
    if (cached === entry) cached = undefined;
}

// vitest's fake timers can't advance AbortSignal.timeout
async function loadBefore(ms: number): Promise<IndexJson> {
    const deadline = new AbortController();
    const timer = setTimeout(() => {
        deadline.abort();
    }, ms);

    try {
        return await createIndexLoader(deadline.signal).load();
    } finally {
        clearTimeout(timer);
    }
}

function currentIndex(): CachedIndex {
    if (cached && cached.expiresAt > Date.now()) return cached;

    const entry = { index: loadBefore(INDEX_WAIT_MS), expiresAt: Date.now() + INDEX_TTL_MS };
    cached = entry;
    entry.index.catch(() => {
        forget(entry);
    });
    return entry;
}

async function loadIndex(): Promise<IndexJson | null> {
    try {
        return await currentIndex().index;
    } catch {
        return null;
    }
}

// each release removes the previous patch of its line from the index. links to that patch 404 without this
export async function proxy(request: NextRequest): Promise<NextResponse> {
    const [, , folder, versionSegment, ...rest] = request.nextUrl.pathname.split('/');
    if (folder === undefined || versionSegment === undefined) return NextResponse.next();

    const extension = TWIN_EXTENSION.exec(versionSegment)?.[0] ?? '';
    const version = versionSegment.slice(0, versionSegment.length - extension.length);
    if (version === DEFAULT_VERSION) return NextResponse.next();

    const entry = (await loadIndex())?.packages[folder];
    const replacement = entry ? replacementVersion(entry, version) : null;
    if (replacement === null) return NextResponse.next();

    const url = request.nextUrl.clone();
    url.pathname = ['', 'packages', folder, `${replacement}${extension}`, ...rest].join('/');
    return NextResponse.redirect(url, PERMANENT_REDIRECT);
}

export const config = {
    matcher: '/packages/:packageId/:versionId/:path*'
};
