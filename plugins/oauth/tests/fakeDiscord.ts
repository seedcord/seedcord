import { once } from 'node:events';
import { createServer } from 'node:http';

import { onTestFinished } from 'vite-plus/test';

import type { IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface SeenRequest {
    method: string;
    // without the api prefix or the query
    route: string;
    // the query with its `?`, or an empty string
    search: string;
    headers: IncomingHttpHeaders;
    body: string;
}

interface Reply {
    status?: number;
    json?: unknown;
}

interface FakeDiscord {
    // pass as a REST client's `api` option
    api: string;
    requests: SeenRequest[];
}

const OK = 200;
const NO_CONTENT = 204;

export async function fakeDiscord(reply: (request: SeenRequest) => Reply): Promise<FakeDiscord> {
    const requests: SeenRequest[] = [];
    const server = createServer((request, response) => {
        const chunks: Buffer[] = [];
        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
            const url = new URL(request.url ?? '', 'http://localhost');
            const seen: SeenRequest = {
                method: request.method ?? '',
                route: url.pathname.replace(/^\/api\/v\d+/u, ''),
                search: url.search,
                headers: request.headers,
                body: Buffer.concat(chunks).toString()
            };
            requests.push(seen);
            const { status = OK, json = {} } = reply(seen);
            if (status === NO_CONTENT) {
                response.writeHead(status).end();
                return;
            }
            response.writeHead(status, { 'content-type': 'application/json' });
            response.end(JSON.stringify(json));
        });
    }).listen(0);
    await once(server, 'listening');
    onTestFinished(() => void server.close());
    // justified: address() is AddressInfo once a TCP server is listening
    const { port } = server.address() as AddressInfo;
    return { api: `http://localhost:${port}/api`, requests };
}
