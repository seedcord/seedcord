import path from 'node:path';

import { ShutdownPhase } from '@seedcord/core/node/internal';
import { Envapter, merge, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';

import { createSigner, type Signer } from '../helpers/ed25519';
import { VALID_TOKEN } from '../helpers/fixtures';

import type { HttpConfig } from '#src/interfaces/Config';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');

function config(): HttpConfig {
    return {
        bot: { interactions: { path: HANDLERS_DIR }, commands: { path: null } },
        subscribers: { path: null },
        port: 0
    };
}

function reset(): void {
    // @ts-expect-error singleton reset between tests
    Seedcord.reset();
}

let live: Seedcord | undefined;

async function readyHost(): Promise<{ signer: Signer; url: string; host: Seedcord }> {
    const signer = await createSigner();
    Envapter.useSource(
        merge(
            new PortableSource(process.env),
            new PortableSource({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN })
        )
    );
    const host = new Seedcord(config());
    live = host;
    await host.start();
    return { signer, url: `http://127.0.0.1:${String(host.port)}`, host };
}

async function signedHeaders(signer: Signer, body: Uint8Array): Promise<Record<string, string>> {
    const timestamp = String(Math.floor(Date.now() / 1000));
    return {
        'x-signature-ed25519': await signer.sign(timestamp, body),
        'x-signature-timestamp': timestamp
    };
}

const encoder = new TextEncoder();

describe('http Seedcord class', () => {
    beforeEach(reset);

    afterEach(async () => {
        await live?.shutdown.run(0, false);
        live = undefined;
        reset();
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

        await host.shutdown.run(0, false);

        await expect(fetch(url, { method: 'POST' })).rejects.toThrow();
    });

    it('skips the health server on healthCheck: false', async () => {
        const { host } = await readyHost();

        expect(host.shutdown.removeTask(ShutdownPhase.Drain, 'stop-healthcheck-server')).toBe(false);
    });

    it('username stays undefined before the ready fetch', async () => {
        const { host } = await readyHost();

        expect(host.username).toBeUndefined();
    });
});
