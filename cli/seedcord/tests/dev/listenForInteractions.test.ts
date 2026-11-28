import { once } from 'node:events';
import { createServer as createNetServer } from 'node:net';

import { DEV_URL_HEADER } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { isGetOrHead } from '@seedcord/utils/internal';
import { describe, expect, it, onTestFinished } from 'vite-plus/test';

import { listenForInteractions } from '#commands/dev/runtime/listenForInteractions';

import type { DevPageServer } from '#commands/dev/runtime/DevPageServer';
import type { LogRecord } from '@seedcord/types';
import type { IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Connect } from 'vite';

type Handle = (request: IncomingMessage, next: (error?: unknown) => void) => void;
type PageServer = Pick<DevPageServer, 'upgrade' | 'middlewares' | 'servedByVite'>;

// justified: a Connect app is a request handler, and the endpoint only calls it as one
function middlewares(handle: Handle): PageServer {
    const app = ((request: IncomingMessage, _response: unknown, next: (error?: unknown) => void) =>
        handle(request, next)) as unknown as Connect.Server;
    return { middlewares: app, upgrade: () => false, servedByVite: ({ method }) => isGetOrHead(method) };
}

const QUICK = { port: 0, host: '127.0.0.1', configFile: 'seedcord.config.ts' };

async function listening(pageServer: PageServer): Promise<string> {
    const { server, port } = await listenForInteractions(pageServer, QUICK);
    onTestFinished(() => {
        server.close();
    });
    return `http://localhost:${String(port)}`;
}

describe('listenForInteractions', () => {
    it("keeps a POST and a GET that vite doesn't serve away from a page at /", async () => {
        const seen: (string | undefined)[] = [];
        const url = await listening({
            ...middlewares(({ url: requested }, next) => {
                seen.push(requested);
                next();
            }),
            servedByVite: ({ method, url: requested }) => method === 'GET' && requested !== '/api/pings'
        });

        await fetch(`${url}/interactions?probe=1`, { method: 'POST', body: '{}' });
        await fetch(`${url}/api/pings`);

        expect(seen).toHaveLength(2);
        expect(seen).not.toContain('/');
    });

    it('hands a GET on with its own path, and its path in a header too', async () => {
        const seen: { url: string | undefined; devUrl: unknown }[] = [];
        const url = await listening(
            middlewares(({ url: requested, headers }, next) => {
                seen.push({ url: requested, devUrl: headers[DEV_URL_HEADER] });
                next();
            })
        );

        await fetch(`${url}/dash`);

        expect(seen).toEqual([{ url: '/dash', devUrl: '/dash' }]);
    });

    it('throws PortInUse when another process holds the port on 127.0.0.1', async () => {
        await using holder = createNetServer().listen(0, '127.0.0.1');
        await once(holder, 'listening');
        // justified: address() is AddressInfo once a TCP server is listening
        const { port } = holder.address() as AddressInfo;

        await expect(
            listenForInteractions(
                middlewares(() => undefined),
                { ...QUICK, port }
            )
        ).rejects.toHaveProperty('code', SeedcordErrorCode.PortInUse);
    });

    it("never leaves the tunnel's address to a process holding the IPv4 wildcard", async () => {
        // nc -l <port> holds 0.0.0.0. linux refuses the second bind, macos allows it
        await using holder = createNetServer((socket) => socket.end('HTTP/1.1 200 OK\r\n\r\n')).listen(0, '0.0.0.0');
        await once(holder, 'listening');
        // justified: address() is AddressInfo once a TCP server is listening
        const { port } = holder.address() as AddressInfo;

        const endpoint = await listenForInteractions(
            middlewares((_request, next) => next()),
            { ...QUICK, port }
        ).catch((error: unknown) => error);

        if (Error.isError(endpoint)) {
            expect(endpoint).toHaveProperty('code', SeedcordErrorCode.PortInUse);
            return;
        }
        // justified: the catch only ever returns an error
        const { server } = endpoint as Awaited<ReturnType<typeof listenForInteractions>>;
        onTestFinished(() => {
            server.close();
        });
        // a 404 here comes from the endpoint because the holder answers 200 to everything
        const response = await fetch(`http://127.0.0.1:${String(port)}/`);
        expect(response.status).toBe(404);
    });

    it('answers 500 and logs the error a middleware passes on', async () => {
        const records: LogRecord[] = [];
        const sink = LoggerChannelRegistry.instance.installSink({ kind: 'capture', onLog: (r) => records.push(r) });
        onTestFinished(() => sink.dispose());
        const url = await listening(middlewares((_request, next) => next(new Error('worker crashed'))));

        const response = await fetch(url, { method: 'POST', body: '{}' });

        expect(response.status).toBe(500);
        const failure = records.find((record) => record.level === 'error');
        expect(failure?.args?.[0]).toBeInstanceOf(Error);
    });
});
