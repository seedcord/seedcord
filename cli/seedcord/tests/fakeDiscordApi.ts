import { once } from 'node:events';
import { createServer } from 'node:http';

import { onTestFinished } from 'vitest';

import type { AddressInfo } from 'node:net';

const OK = 200;

interface FakeDiscord {
    // pass as the bot's REST `api` option
    api: string;
    // every route asked for, without the api prefix or the query
    routes: string[];
    deployedNames: string[][];
}

// a GET missing from `answers` gets the shape a dev startup reads
export async function fakeDiscordApi(answers: Record<string, unknown> = {}): Promise<FakeDiscord> {
    const routes: string[] = [];
    const deployedNames: string[][] = [];
    const server = createServer((request, response) => {
        const chunks: Buffer[] = [];
        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
            const route = request.url?.replace(/^\/api\/v\d+/u, '').split('?')[0] ?? '';
            routes.push(route);
            response.writeHead(OK, { 'content-type': 'application/json' });
            if (route in answers) {
                response.end(JSON.stringify(answers[route]));
                return;
            }
            if (request.method !== 'PUT') {
                response.end(JSON.stringify({ username: 'fake', items: [] }));
                return;
            }
            // justified: the bulk-overwrite body is an array of command JSON
            const commands = JSON.parse(Buffer.concat(chunks).toString()) as { name: string }[];
            deployedNames.push(commands.map((command) => command.name));
            response.end(JSON.stringify(commands.map((command, index) => ({ ...command, id: String(index + 1) }))));
        });
    }).listen(0);
    await once(server, 'listening');
    onTestFinished(() => void server.close());
    // justified: address() is AddressInfo once a TCP server is listening
    const { port } = server.address() as AddressInfo;
    return { api: `http://localhost:${port}/api`, routes, deployedNames };
}
