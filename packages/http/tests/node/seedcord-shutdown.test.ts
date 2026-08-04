import path from 'node:path';

import { Envapter, merge, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Seedcord } from '@src/node/Seedcord';

import { createSigner, type Signer } from '../helpers/ed25519';
import { VALID_TOKEN } from '../helpers/fixtures';

import type { HttpConfig } from '@src/interfaces/Config';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');

function config(): HttpConfig {
    return {
        bot: { interactions: { path: HANDLERS_DIR }, commands: { path: null } },
        subscribers: { path: null }
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
    await host.start(0);
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

describe('http Seedcord shutdown', () => {
    beforeEach(reset);

    afterEach(async () => {
        await live?.shutdown.run(0, false);
        live = undefined;
        reset();
    });

    it('a request awaiting its ack survives a shutdown started mid-flight', async () => {
        const { signer, url, host } = await readyHost();
        // the slowping gate delays the 202 past the shutdown start below
        const body = encoder.encode(
            JSON.stringify({
                type: 2,
                id: '1',
                token: 'interaction-token',
                application_id: '2',
                app_permissions: '0',
                data: { type: 1, name: 'slowping', options: [] }
            })
        );

        const started = Date.now();
        const pending = fetch(url, { method: 'POST', headers: await signedHeaders(signer, body), body });
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
        const closing = host.shutdown.run(0, false);

        const response = await pending;
        expect(response.status).toBe(202);
        // the gate held the ack past the shutdown start. A fast 202 would prove nothing
        expect(Date.now() - started).toBeGreaterThan(250);
        await closing;
    });
});
