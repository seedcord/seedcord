import { request as httpRequest } from 'node:http';
import { createServer } from 'node:net';

import { describe, it, expect } from 'vitest';

import { HealthCheck } from '@node/HealthCheck';

import type { CoordinatedShutdown } from '@node/Lifecycle/CoordinatedShutdown';

// fixture: HealthCheck only calls shutdown.addTask, so a stub avoids constructing a real
// CoordinatedShutdown (which registers process signal handlers).
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

function httpGet(url: string): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
        const req = httpRequest(url, (res) => {
            let body = '';
            res.on('data', (chunk: Buffer) => (body += chunk.toString('utf8')));
            res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
        });
        req.once('error', reject);
        req.end();
    });
}

describe('HealthCheck', () => {
    it('resolves stop() immediately when never initialized', async () => {
        const hc = new HealthCheck(shutdownStub);
        await expect(hc.stop()).resolves.toBeUndefined();
    });

    it('serves 200 on the health path and 404 elsewhere, then stops without hanging', async () => {
        const port = await freePort();
        const hc = new HealthCheck(shutdownStub, { port, host: '127.0.0.1' });

        await hc.init();

        const ok = await httpGet(`http://127.0.0.1:${port}${hc.path}`);
        expect(ok.status).toBe(200);
        expect(JSON.parse(ok.body)).toMatchObject({ status: 'ok' });

        const missing = await httpGet(`http://127.0.0.1:${port}/does-not-exist`);
        expect(missing.status).toBe(404);

        await expect(hc.stop()).resolves.toBeUndefined();
        // second stop hits the !listening guard and must resolve rather than hang the shutdown phase
        await expect(hc.stop()).resolves.toBeUndefined();
    });
});
