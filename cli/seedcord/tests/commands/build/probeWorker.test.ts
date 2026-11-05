import { once } from 'node:events';
import { createServer } from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import { probeWorker } from '#commands/build/builder/probeWorker';

import type { RequestListener } from 'node:http';
import type { AddressInfo } from 'node:net';

async function serve(listener: RequestListener): Promise<AsyncDisposable & { url: string }> {
    const server = createServer(listener);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    // justified: address() is AddressInfo once a TCP server is listening
    const { port } = server.address() as AddressInfo;
    return {
        url: `http://127.0.0.1:${port}/`,
        [Symbol.asyncDispose]: async () => {
            server.closeAllConnections();
            server.close();
            await once(server, 'close');
        }
    };
}

describe('probeWorker', () => {
    it('passes a worker that answers 405', async () => {
        await using worker = await serve((_request, response) => response.writeHead(405).end());

        await expect(probeWorker(worker.url)).resolves.toBeUndefined();
    });

    it('gives the status and the body for any other answer', async () => {
        await using worker = await serve((_request, response) => response.writeHead(500).end('bot.ts threw'));

        const failure = await probeWorker(worker.url);

        expect(failure?.reason).toContain('500');
        expect(failure?.reason).toContain('bot.ts threw');
    });

    it.each([
        [200, true],
        [500, false]
    ])('points at the instance export only when the worker answers %i', async (status, hinted) => {
        await using worker = await serve((_request, response) => response.writeHead(status).end());

        const failure = await probeWorker(worker.url);

        expect(failure?.reason.includes('default-exports')).toBe(hinted);
    });

    it('reports the wait when the worker never answers', async () => {
        await using worker = await serve(() => undefined);

        await expect(probeWorker(worker.url, 50)).resolves.toMatchObject({
            reason: expect.stringContaining('0.05s') as string
        });
    });

    describe('when fetch fails', () => {
        // what undici throws when a socket takes more than its 10s to connect
        const connectTimedOut = new TypeError('fetch failed', {
            cause: Object.assign(new Error('Connect Timeout Error'), { code: 'UND_ERR_CONNECT_TIMEOUT' })
        });
        const PROBE_URL = 'http://127.0.0.1:1/';

        it('tries again after a connect timeout', async () => {
            using fetchSpy = vi
                .spyOn(globalThis, 'fetch')
                .mockRejectedValueOnce(connectTimedOut)
                .mockResolvedValueOnce(new Response(null, { status: 405 }));

            await expect(probeWorker(PROBE_URL)).resolves.toBeUndefined();
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });

        it('reports the wait when every connect attempt times out', async () => {
            using _fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
                await new Promise((resolve) => setImmediate(resolve));
                init?.signal?.throwIfAborted();
                throw connectTimedOut;
            });

            await expect(probeWorker(PROBE_URL, 50)).resolves.toMatchObject({
                reason: expect.stringContaining('0.05s') as string
            });
        });

        it('stops right away when the worker closes the connection', async () => {
            using fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));

            await expect(probeWorker(PROBE_URL)).resolves.toMatchObject({
                reason: expect.stringContaining('closed the connection') as string
            });
            expect(fetchSpy).toHaveBeenCalledOnce();
        });
    });
});
