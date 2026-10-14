import { once } from 'node:events';
import { createServer } from 'node:http';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { Server } from 'node:http';
import type { Connect } from 'vite';

const METHOD_NOT_ALLOWED = 405;
const NOT_FOUND = 404;

function isPortInUse(error: unknown): boolean {
    return Error.isError(error) && 'code' in error && error.code === 'EADDRINUSE';
}

export async function listenForInteractions(
    middlewares: Connect.Server,
    port: number,
    wranglerConfig: string
): Promise<Server> {
    const server = createServer((request, response) => {
        if (request.method !== 'POST') {
            response.writeHead(METHOD_NOT_ALLOWED, { allow: 'POST' }).end();
            return;
        }
        // vite serves the bot's source at /src/... and /@fs/...
        request.url = '/';
        middlewares(request, response, () => response.writeHead(NOT_FOUND).end());
    });
    server.listen(port);
    try {
        await once(server, 'listening');
    } catch (error: unknown) {
        if (!isPortInUse(error)) throw error;
        throw new SeedcordError(SeedcordErrorCode.CliEdgeDevPortInUse, [port, wranglerConfig], { cause: error });
    }
    return server;
}
