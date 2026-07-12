import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';

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

// buffers the raw body before any parse so ed25519 verifies the exact signed bytes
export async function toWebRequest(request: IncomingMessage): Promise<Request> {
    const chunks: Buffer[] = [];
    // justified: the async iterator is typed any and IncomingMessage yields Buffer chunks
    for await (const chunk of request) chunks.push(chunk as Buffer);

    const method = request.method ?? 'GET';
    const body = method === 'GET' || method === 'HEAD' ? undefined : new Uint8Array(Buffer.concat(chunks));

    return new Request(`http://${request.headers.host ?? 'localhost'}${request.url ?? '/'}`, {
        method,
        headers: toHeaders(request.headers),
        ...(body !== undefined && { body })
    });
}

export async function writeWebResponse(response: Response, out: ServerResponse): Promise<void> {
    out.writeHead(response.status, Object.fromEntries(response.headers));
    out.end(response.body === null ? undefined : Buffer.from(await response.arrayBuffer()));
}
