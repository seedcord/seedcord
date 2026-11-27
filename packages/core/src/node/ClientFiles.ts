import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';

import { staticFileAt } from '@seedcord/utils/internal';
import { lookup } from 'mrmime';

import { FOLDER_REDIRECT, HASHED_ASSETS } from '#src/webConstants';

export class ClientFiles {
    constructor(private readonly dir: string) {}

    public async answer(request: Request): Promise<Response | undefined> {
        if (request.method !== 'GET' && request.method !== 'HEAD') return undefined;
        const url = new URL(request.url);
        const found = await staticFileAt(this.dir, url, (file) => stat(file).catch(() => undefined));
        if (found === undefined) return undefined;
        if ('redirect' in found) {
            return new Response(null, { status: FOLDER_REDIRECT, headers: { location: found.redirect } });
        }

        const headers = new Headers({
            'content-type': lookup(found.file) ?? 'application/octet-stream',
            'content-length': String(found.size)
        });
        if (url.pathname.startsWith(HASHED_ASSETS.path)) headers.set('cache-control', HASHED_ASSETS.cacheControl);
        // justified: @types/node types toWeb() with node:stream/web's ReadableStream, which Response's body type doesn't accept
        const body =
            request.method === 'HEAD' ? null : (Readable.toWeb(createReadStream(found.file)) as ReadableStream);
        return new Response(body, { headers });
    }
}
