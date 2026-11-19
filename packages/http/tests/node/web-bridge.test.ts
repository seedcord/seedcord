import { WebServer } from '@seedcord/core/node/internal';
import { Logger } from '@seedcord/logger';
import { Envapter, PortableSource } from 'envapt';
import { describe, expect, it } from 'vite-plus/test';

import { Seedcord } from '#src/edge/Seedcord';
import { registerBakedIds } from '#tests/helpers/bakedIds';
import { createSigner, type Signer } from '#tests/helpers/ed25519';
import { VALID_TOKEN } from '#tests/helpers/fixtures';
import { capturingCtx } from '#tests/helpers/interactions';

interface ReadySeedcord extends AsyncDisposable {
    readonly signer: Signer;
    readonly url: string;
}

async function readySeedcord(): Promise<ReadySeedcord> {
    const signer = await createSigner();
    Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: VALID_TOKEN }));
    const bakedIds = registerBakedIds({ publicKey: signer.publicKeyHex });
    // @ts-expect-error singleton reset between bots
    Seedcord.reset();
    // any engine works behind the bridge. the edge one doesn't need a server of its own
    const seedcord = new Seedcord({
        bot: { interactions: { path: null }, commands: { path: null } },
        subscribers: { path: null }
    });
    const server = new WebServer({
        logger: new Logger('Server'),
        shutdown: { addTask: () => undefined },
        startup: { isReady: true, hasBegun: true },
        health: undefined,
        plugins: () => Promise.resolve(undefined),
        tail: (request) => seedcord.fetch(request, undefined, capturingCtx()),
        portSetting: 'port'
    });
    const port = await server.serve({ port: 0, host: '127.0.0.1' });
    return {
        signer,
        url: `http://127.0.0.1:${String(port)}`,
        [Symbol.asyncDispose]: async () => {
            bakedIds[Symbol.dispose]();
            await server.close();
        }
    };
}

async function post(url: string, body: Uint8Array | string, headers: Record<string, string> = {}): Promise<Response> {
    return fetch(url, { method: 'POST', headers, body });
}

async function signedHeaders(signer: Signer, body: Uint8Array): Promise<Record<string, string>> {
    const timestamp = String(Math.floor(Date.now() / 1000));
    return {
        'x-signature-ed25519': await signer.sign(timestamp, body),
        'x-signature-timestamp': timestamp
    };
}

const encoder = new TextEncoder();

describe('node web bridge', () => {
    it('answers a signed PING through a real node:http round trip', async () => {
        await using bot = await readySeedcord();
        const { signer, url } = bot;
        const body = encoder.encode('{"type":1}');

        const response = await post(url, body, await signedHeaders(signer, body));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ type: 1 });
    });

    it('acks an unrecognized interaction shape with 202 through the bridge', async () => {
        await using bot = await readySeedcord();
        const { signer, url } = bot;
        const body = encoder.encode('{"type":99}');

        const response = await post(url, body, await signedHeaders(signer, body));

        expect(response.status).toBe(202);
        await expect(response.text()).resolves.toBe('');
    });

    it('rejects bytes that differ from the signed bytes with 401', async () => {
        await using bot = await readySeedcord();
        const { signer, url } = bot;
        const signed = encoder.encode('{"type":1}');

        const response = await post(url, '{"type":1} ', await signedHeaders(signer, signed));

        expect(response.status).toBe(401);
    });
});
