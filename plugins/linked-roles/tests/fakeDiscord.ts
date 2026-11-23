import { once } from 'node:events';
import { createServer } from 'node:http';

import { onTestFinished } from 'vite-plus/test';

import type { IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Promisable } from 'type-fest';

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
// listen() without a host also takes connections from other machines on the network
const LOOPBACK = '127.0.0.1';

export async function fakeDiscord(reply: (request: SeenRequest) => Promisable<Reply>): Promise<FakeDiscord> {
    const requests: SeenRequest[] = [];
    const server = createServer((request, response) => {
        const chunks: Buffer[] = [];
        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
            const url = new URL(request.url ?? '', 'http://localhost');
            const seen: SeenRequest = {
                method: request.method ?? '',
                // decoded because discord-api-types writes the current user's route as /users/%40me
                route: decodeURIComponent(url.pathname.replace(/^\/api\/v\d+/u, '')),
                search: url.search,
                headers: request.headers,
                body: Buffer.concat(chunks).toString()
            };
            requests.push(seen);
            void Promise.resolve(reply(seen)).then(({ status = OK, json = {} }) => {
                if (status === NO_CONTENT) {
                    response.writeHead(status).end();
                    return;
                }
                response.writeHead(status, { 'content-type': 'application/json' });
                response.end(JSON.stringify(json));
            });
        });
    }).listen(0, LOOPBACK);
    await once(server, 'listening');
    onTestFinished(() => void server.close());
    // justified: address() is AddressInfo once a TCP server is listening
    const { port } = server.address() as AddressInfo;
    return { api: `http://${LOOPBACK}:${port}/api`, requests };
}
