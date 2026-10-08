import path from 'node:path';

import { ShutdownPhase, shutdownOf } from '@seedcord/core/node/internal';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { signedHeaders, type Signer } from '#tests/helpers/ed25519';
import { bindSignedEnv, resetSeedcord, serverConfig, stopHost } from '#tests/helpers/nodeHost';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');

let live: Seedcord | undefined;

async function readyHost(): Promise<{ signer: Signer; url: string; host: Seedcord }> {
    const signer = await bindSignedEnv();
    const host = new Seedcord(serverConfig({ interactions: { path: HANDLERS_DIR } }));
    live = host;
    await host.start();
    return { signer, url: `http://127.0.0.1:${String(host.port)}`, host };
}

const encoder = new TextEncoder();

describe('http Seedcord class', () => {
    beforeEach(resetSeedcord);

    afterEach(async () => {
        await stopHost(live);
        live = undefined;
    });

    it('answers a signed PING through its own node server', async () => {
        const { signer, url } = await readyHost();
        const body = encoder.encode('{"type":1}');

        const response = await fetch(url, { method: 'POST', headers: await signedHeaders(signer, body), body });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ type: 1 });
    });

    it('acks a discovered slash route with a 202', async () => {
        const { signer, url } = await readyHost();
        const body = encoder.encode(
            JSON.stringify({
                type: 2,
                id: '1',
                token: 'interaction-token',
                application_id: '2',
                app_permissions: '0',
                data: { type: 1, name: 'ping', options: [] }
            })
        );

        const response = await fetch(url, { method: 'POST', headers: await signedHeaders(signer, body), body });

        expect(response.status).toBe(202);
    });

    it('shutdown closes the server', async () => {
        const { host, url } = await readyHost();

        await shutdownOf(host).run(0, false);

        await expect(fetch(url, { method: 'POST' })).rejects.toThrow();
    });

    it('skips the health server on healthCheck: false', async () => {
        const { host } = await readyHost();

        expect(shutdownOf(host).removeTask(ShutdownPhase.Drain, 'stop-healthcheck-server')).toBe(false);
    });

    it('username stays undefined before the ready fetch', async () => {
        const { host } = await readyHost();

        expect(host.username).toBeUndefined();
    });
});
