import { once } from 'node:events';
import { createServer } from 'node:http';

import { describe, expect, it } from 'vitest';

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
});
