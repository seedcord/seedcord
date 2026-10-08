import path from 'node:path';

import { ShutdownPhase, shutdownOf } from '@seedcord/core/node/internal';
import { describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { slashPayload } from '#tests/helpers/interactions';
import { bindSignedEnv, postSigned, serverConfig } from '#tests/helpers/nodeHost';

import type { HttpServerConfig } from '#src/interfaces/Config';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');

function config(): HttpServerConfig {
    return serverConfig({ interactions: { path: HANDLERS_DIR } });
}

describe('http Seedcord class', () => {
    it('answers a signed PING through its own node server', async () => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord(config());
        await host.start();

        const response = await postSigned(host, signer, '{"type":1}');

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ type: 1 });
    });

    it('acks a discovered slash route with a 202', async () => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord(config());
        await host.start();

        const response = await postSigned(host, signer, JSON.stringify(slashPayload('ping')));

        expect(response.status).toBe(202);
    });

    it('shutdown closes the server', async () => {
        await bindSignedEnv();
        await using host = new Seedcord(config());
        await host.start();
        const url = `http://127.0.0.1:${String(host.port)}`;

        await shutdownOf(host).run(0, false);

        await expect(fetch(url, { method: 'POST' })).rejects.toThrow();
    });

    it('skips the health server on healthCheck: false', async () => {
        await bindSignedEnv();
        await using host = new Seedcord(config());
        await host.start();

        expect(shutdownOf(host).removeTask(ShutdownPhase.Drain, 'stop-healthcheck-server')).toBe(false);
    });

    it('username stays undefined before the ready fetch', async () => {
        await bindSignedEnv();
        await using host = new Seedcord(config());
        await host.start();

        expect(host.username).toBeUndefined();
    });
});
