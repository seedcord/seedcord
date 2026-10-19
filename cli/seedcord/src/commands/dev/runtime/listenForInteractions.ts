import { once } from 'node:events';
import { createServer } from 'node:http';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { isPortInUse } from '@seedcord/utils/internal';

import { cliLogger } from '#core/cliLogger';

import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Connect } from 'vite';

const METHOD_NOT_ALLOWED = 405;
const NOT_FOUND = 404;
const SERVER_ERROR = 500;

const logger = cliLogger('Worker');

interface InteractionsEndpoint {
    server: Server;
    // port 0 lets the system pick one
    port: number;
}

interface ListenOptions {
    readonly port: number;
    // undefined binds every address
    readonly host: string | undefined;
    readonly configFile: string;
}

export async function listenForInteractions(
    middlewares: Connect.Server,
    { port, host, configFile }: ListenOptions
): Promise<InteractionsEndpoint> {
    const server = createServer((request, response) => {
        if (request.method !== 'POST') {
            response.writeHead(METHOD_NOT_ALLOWED, { allow: 'POST' }).end();
            return;
        }
        // vite serves the bot's source at /src/... and /@fs/...
        request.url = '/';
        middlewares(request, response, (error?: unknown) => {
            if (error === undefined) {
                response.writeHead(NOT_FOUND).end();
                return;
            }
            logger.error('The worker failed to answer a request', error);
            response.writeHead(SERVER_ERROR).end();
        });
    });
    server.listen(port, host);
    try {
        await once(server, 'listening');
    } catch (error: unknown) {
        if (!isPortInUse(error)) throw error;
        throw new SeedcordError(SeedcordErrorCode.PortInUse, [port, 'port', configFile], { cause: error });
    }
    // justified: address() is AddressInfo once a TCP server is listening
    return { server, port: (server.address() as AddressInfo).port };
}
