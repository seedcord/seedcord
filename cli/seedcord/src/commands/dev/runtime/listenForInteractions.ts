import { once } from 'node:events';
import { createServer } from 'node:http';

import { DEV_URL_HEADER } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { isPortInUse } from '@seedcord/utils/internal';

import { cliLogger } from '#core/cliLogger';

import { servedByVite } from './DevPageServer';

import type { DevPageServer } from './DevPageServer';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

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

// vite's middlewares run first on every request, and the cloudflare plugin's middleware hands the worker the ones vite passes on
export async function listenForInteractions(
    pageServer: Pick<DevPageServer, 'upgrade' | 'middlewares'>,
    { port, host, configFile }: ListenOptions
): Promise<InteractionsEndpoint> {
    const server = createServer((request, response) => {
        request.headers[DEV_URL_HEADER] = request.url ?? '/';
        if (!servedByVite(request)) request.url = '/';
        pageServer.middlewares(request, response, (error?: unknown) => {
            if (error === undefined) {
                response.writeHead(NOT_FOUND).end();
                return;
            }
            logger.error('The worker failed to answer a request', error);
            response.writeHead(SERVER_ERROR).end();
        });
    });
    server.on('upgrade', (request, socket, head) => {
        if (!pageServer.upgrade(request, socket, head)) socket.destroy();
    });
    server.listen(port, host);
    try {
        await once(server, 'listening');
    } catch (error: unknown) {
        if (!isPortInUse(error)) throw error;
        throw new SeedcordError(SeedcordErrorCode.PortInUse, [port, 'dev.port', configFile], { cause: error });
    }
    // justified: address() is AddressInfo once a TCP server is listening
    return { server, port: (server.address() as AddressInfo).port };
}
