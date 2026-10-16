import { once } from 'node:events';
import { createServer as createNetServer } from 'node:net';

import { SeedcordErrorCode } from '@seedcord/errors';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { describe, expect, it, onTestFinished } from 'vitest';

import { listenForInteractions } from '#commands/dev/runtime/listenForInteractions';

import type { LogRecord } from '@seedcord/types';
import type { AddressInfo } from 'node:net';
import type { Connect } from 'vite';

// justified: a Connect app is a request handler, the endpoint calls nothing else on it
function middlewares(handle: (url: string | undefined, next: (error?: unknown) => void) => void): Connect.Server {
    return ((request: { url?: string }, _response: unknown, next: (error?: unknown) => void) =>
        handle(request.url, next)) as unknown as Connect.Server;
}

const QUICK = { port: 0, host: '127.0.0.1', configFile: 'seedcord.config.ts' };

async function listening(app: Connect.Server): Promise<string> {
    const { server, port } = await listenForInteractions(app, QUICK);
    onTestFinished(() => {
        server.close();
    });
    return `http://localhost:${String(port)}`;
}

describe('listenForInteractions', () => {
    it('hands every POST to the worker as /', async () => {
        const seen: (string | undefined)[] = [];
        const url = await listening(
            middlewares((path, next) => {
                seen.push(path);
                next();
            })
        );

        await fetch(`${url}/interactions?probe=1`, { method: 'POST', body: '{}' });

        expect(seen).toEqual(['/']);
    });

    it('answers a GET with 405 and never reaches the worker', async () => {
        const seen: (string | undefined)[] = [];
        const url = await listening(middlewares((path) => seen.push(path)));

        const response = await fetch(`${url}/src/bot.ts`);

        expect(response.status).toBe(405);
        expect(seen).toEqual([]);
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
            middlewares(() => undefined),
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
        const response = await fetch(`http://127.0.0.1:${String(port)}/`);
        expect(response.status).toBe(405);
    });

    it('answers 500 and logs the error a middleware passes on', async () => {
        const records: LogRecord[] = [];
        const sink = LoggerChannelRegistry.instance.installSink({ kind: 'capture', onLog: (r) => records.push(r) });
        onTestFinished(() => sink.dispose());
        const url = await listening(middlewares((_path, next) => next(new Error('worker crashed'))));

        const response = await fetch(url, { method: 'POST', body: '{}' });

        expect(response.status).toBe(500);
        const failure = records.find((record) => record.level === 'error');
        expect(failure?.args?.[0]).toBeInstanceOf(Error);
    });
});
