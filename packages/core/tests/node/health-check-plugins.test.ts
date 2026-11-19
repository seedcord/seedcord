import { createServer } from 'node:net';

import { describe, expect, it } from 'vite-plus/test';

import { HealthCheck } from '#node/HealthCheck';

import type { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';

// fixture: HealthCheck only calls shutdown.addTask
const shutdownStub = { addTask: () => undefined } as unknown as CoordinatedShutdown;

function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const probe = createServer();
        probe.once('error', reject);
        probe.listen(0, '127.0.0.1', () => {
            const address = probe.address();
            const port = typeof address === 'object' && address ? address.port : 0;
            probe.close(() => resolve(port));
        });
    });
}

describe('the health server with plugin answers', () => {
    it('sends a path other than health to the plugins and keeps the 404 when none answers', async () => {
        const port = await freePort();
        const seen: string[] = [];
        const server = new HealthCheck(shutdownStub, { port, host: '127.0.0.1' }, (request) => {
            seen.push(`${request.method} ${new URL(request.url).pathname}`);
            return Promise.resolve(
                new URL(request.url).pathname === '/page' ? new Response('page', { status: 201 }) : undefined
            );
        });
        await server.init();

        const base = `http://127.0.0.1:${String(port)}`;
        const answered = await fetch(`${base}/page`, { method: 'POST', body: 'hi' });
        const passed = await fetch(`${base}/other`);
        const health = await fetch(`${base}/health`);
        await server.stop();

        expect(answered.status).toBe(201);
        expect(await answered.text()).toBe('page');
        expect(passed.status).toBe(404);
        expect(health.status).toBe(200);
        expect(seen).toEqual(['POST /page', 'GET /other']);
    });
});
