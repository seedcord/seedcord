import { once } from 'node:events';
import { createServer } from 'node:http';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { LOADED_STATUS, notLoadedReason } from '#commands/build/builder/bootWorker';

import type { AddressInfo } from 'node:net';
import type { Connect } from 'vite';

const NOT_FOUND = 404;

// @cloudflare/vite-plugin imports the worker entry on a request. when bot.ts exports something the
// config doesn't declare, the plugin restarts miniflare and nothing imports the entry again
export async function loadWorkerEntry(middlewares: Connect.Server, instance: string): Promise<void> {
    const server = createServer((request, response) => {
        middlewares(request, response, () => response.writeHead(NOT_FOUND).end());
    });
    server.listen(0, '127.0.0.1');
    try {
        await once(server, 'listening');
        // justified: address() is AddressInfo once a TCP server is listening
        const { port } = server.address() as AddressInfo;
        const response = await fetch(`http://127.0.0.1:${port}/`);
        if (response.status === LOADED_STATUS) return;
        const reason = `${notLoadedReason(response.status)}\n${await response.text()}`;
        throw new SeedcordError(SeedcordErrorCode.CliStartFailed, [instance, reason]);
    } finally {
        server.closeAllConnections();
        server.close();
    }
}
