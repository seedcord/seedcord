import path from 'node:path';

import { shutdownOf } from '@seedcord/core/node/internal';
import { Envapter, merge, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { createSigner, type Signer } from '#tests/helpers/ed25519';
import { VALID_TOKEN } from '#tests/helpers/fixtures';

import { ran } from './discovery/fixtures/middlewares/recorder';

import type { HttpConfig } from '#src/interfaces/Config';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');
const MIDDLEWARES_DIR = path.resolve(__dirname, './discovery/fixtures/middlewares');

function config(): HttpConfig {
    return {
        bot: {
            interactions: { path: HANDLERS_DIR, middlewares: MIDDLEWARES_DIR },
            commands: { path: null }
        },
        subscribers: { path: null },
        port: 0
    };
}

function reset(): void {
    // @ts-expect-error singleton reset between tests
    Seedcord.reset();
}

let live: Seedcord | undefined;

async function signedHeaders(signer: Signer, body: Uint8Array): Promise<Record<string, string>> {
    const timestamp = String(Math.floor(Date.now() / 1000));
    return {
        'x-signature-ed25519': await signer.sign(timestamp, body),
        'x-signature-timestamp': timestamp
    };
}

const encoder = new TextEncoder();

const slashBody = (): Uint8Array =>
    encoder.encode(
        JSON.stringify({
            type: 2,
            id: '1',
            token: 'interaction-token',
            application_id: '2',
            app_permissions: '0',
            user: { id: 'u1' },
            data: { type: 1, name: 'ping', options: [] }
        })
    );

beforeEach(() => {
    reset();
    ran.length = 0;
});

afterEach(async () => {
    if (live) await shutdownOf(live).run(0, false);
    live = undefined;
    reset();
});

describe('the http host and its middleware directory', () => {
    it('runs a middleware loaded from the configured directory', async () => {
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

        const body = slashBody();
        const response = await fetch(`http://127.0.0.1:${String(host.port)}`, {
            method: 'POST',
            headers: await signedHeaders(signer, body),
            body
        });
        expect(response.status).toBe(202);

        // shutdown drains the dispatch the 202 left running
        await shutdownOf(host).run(0, false);
        live = undefined;

        expect(ran).toEqual(['Audit']);
    });
});
