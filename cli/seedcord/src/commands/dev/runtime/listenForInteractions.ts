import { once } from 'node:events';
import { createServer } from 'node:http';

import { DEV_URL_HEADER } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { isPortInUse } from '@seedcord/utils/internal';

import { cliLogger } from '#core/cliLogger';

import type { IncomingMessage, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Connect } from 'vite';

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
    // where vite serves the bot's root folder, like /src
    readonly rootKey: string;
}

function servedByVite({ method, url = '/' }: IncomingMessage, rootKey: string): boolean {
    // first, the bot answers every POST. if vite got one for a path with a static file, discord would get a 405
    // and the request would never reach the bot
    if (method !== 'GET' && method !== 'HEAD') return false;
    // then the bot answers requests for its own folder too because vite would hand its source to anyone with the tunnel url
    if (url.startsWith(`${rootKey}/`)) return false;
    // last, vite only gets /@fs/ for node_modules, where its client and a site's packages load from
    return !url.startsWith('/@fs/') || url.includes('/node_modules/');
}

export async function listenForInteractions(
    middlewares: Connect.Server,
    { port, host, configFile, rootKey }: ListenOptions
): Promise<InteractionsEndpoint> {
    const server = createServer((request, response) => {
        request.headers[DEV_URL_HEADER] = request.url ?? '/';
        if (!servedByVite(request, rootKey)) request.url = '/';
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
        throw new SeedcordError(SeedcordErrorCode.PortInUse, [port, 'dev.port', configFile], { cause: error });
    }
    // justified: address() is AddressInfo once a TCP server is listening
    return { server, port: (server.address() as AddressInfo).port };
}
