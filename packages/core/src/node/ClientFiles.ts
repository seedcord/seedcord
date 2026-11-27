import { openAsBlob } from 'node:fs';

import { isGetOrHead, staticFileAt } from '@seedcord/utils/internal';
import { lookup } from 'mrmime';

import { FOLDER_REDIRECT, HASHED_ASSETS } from '#src/webConstants';

export class ClientFiles {
    constructor(private readonly dir: string) {}

    public async answer(request: Request): Promise<Response | undefined> {
        if (!isGetOrHead(request.method)) return undefined;
        const url = new URL(request.url);
        const found = await staticFileAt(this.dir, url);
        if (found === undefined) return undefined;
        if ('redirect' in found) {
            return new Response(null, { status: FOLDER_REDIRECT, headers: { location: found.redirect } });
        }

        const headers = new Headers({
            'content-type': lookup(found.file) ?? 'application/octet-stream',
            'content-length': String(found.size)
        });
        if (url.pathname.startsWith(HASHED_ASSETS.path)) headers.set('cache-control', HASHED_ASSETS.cacheControl);
        return new Response(request.method === 'HEAD' ? null : await openAsBlob(found.file), { headers });
    }
}
