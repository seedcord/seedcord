import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { hasErrorCode } from '@seedcord/utils/internal';

import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import type { Arrayable } from 'type-fest';

function toHeaders(raw: IncomingHttpHeaders): Headers {
    const headers = new Headers();
    for (const [name, value] of Object.entries(raw)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
            for (const item of value) headers.append(name, item);
        } else {
            headers.set(name, value);
        }
    }
    return headers;
}

// buffers the raw body before any parse so ed25519 verifies the exact signed bytes.
// undefined means the body passed bodyLimit
export async function toWebRequest(request: IncomingMessage, bodyLimit: number): Promise<Request | undefined> {
    const chunks: Buffer[] = [];
    let size = 0;
    // justified: the async iterator is typed any and IncomingMessage yields Buffer chunks
    for await (const chunk of request as AsyncIterable<Buffer>) {
        size += chunk.length;
        // reads past the limit without storing chunks because the server writes its 413 to this socket
        if (size <= bodyLimit) chunks.push(chunk);
    }
    if (size > bodyLimit) return undefined;

    const method = request.method ?? 'GET';
    const body = method === 'GET' || method === 'HEAD' ? undefined : new Uint8Array(Buffer.concat(chunks));

    return new Request(`http://${request.headers.host ?? 'localhost'}${request.url ?? '/'}`, {
        method,
        headers: toHeaders(request.headers),
        ...(body !== undefined && { body })
    });
}

export async function writeWebResponse(response: Response, out: ServerResponse): Promise<void> {
    const headers: Record<string, Arrayable<string>> = Object.fromEntries(response.headers);
    // iterating Headers comma-joins same-name values, which corrupts Set-Cookie (a per-cookie header)
    const cookies = response.headers.getSetCookie();
    if (cookies.length > 0) headers['set-cookie'] = cookies;

    out.writeHead(response.status, headers);
    if (response.body === null) {
        out.end();
        return;
    }

    try {
        // a body can be a stream that never ends, like server-sent events
        await pipeline(Readable.fromWeb(response.body), out);
    } catch (error) {
        // the client disconnected
        if (!hasErrorCode(error, 'ERR_STREAM_PREMATURE_CLOSE')) throw error;
    }
}
