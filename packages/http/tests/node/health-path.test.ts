import path from 'node:path';

import { Envapter, merge, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Seedcord } from '@src/node/Seedcord';

import { createSigner } from '../helpers/ed25519';
import { VALID_TOKEN } from '../helpers/fixtures';

import type { HttpConfig } from '@src/interfaces/Config';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');

function config(healthPath?: string): HttpConfig {
    return {
        bot: { interactions: { path: HANDLERS_DIR }, commands: { path: null } },
        subscribers: { path: null },
        port: 0,
        ...(!(healthPath === undefined) && { healthCheck: { path: healthPath } })
    };
}

function reset(): void {
    // @ts-expect-error singleton reset between tests
    Seedcord.reset();
}

let live: Seedcord | undefined;

async function readyHost(healthPath?: string): Promise<string> {
    const signer = await createSigner();
    Envapter.useSource(
        merge(
            new PortableSource(process.env),
            new PortableSource({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN })
        )
    );
    const host = new Seedcord(config(healthPath));
    live = host;
    await host.start();
    return `http://127.0.0.1:${String(host.port)}`;
}

describe('http health path', () => {
    beforeEach(reset);

    afterEach(async () => {
        await live?.shutdown.run(0, false);
        live = undefined;
        reset();
    });

    it('serves the health path on the interactions port', async () => {
        const url = await readyHost();

        const response = await fetch(`${url}/health`);

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({ status: 'ok' });
    });

    it('leaves every other GET to the engine', async () => {
        const url = await readyHost();

        const response = await fetch(url);

        expect(response.status).toBe(405);
    });

    it('serves a configured path', async () => {
        const url = await readyHost('/healthz');

        await expect(fetch(`${url}/healthz`).then((r) => r.status)).resolves.toBe(200);
        await expect(fetch(`${url}/health`).then((r) => r.status)).resolves.toBe(405);
    });

    // the dev tunnel probes with an unsigned POST, which a health path of '/' would otherwise shadow
    it('leaves an unsigned POST to the engine even when health owns the root', async () => {
        const url = await readyHost('/');

        await expect(fetch(url).then((r) => r.status)).resolves.toBe(200);
        await expect(fetch(url, { method: 'POST' }).then((r) => r.status)).resolves.toBe(401);
    });
});
