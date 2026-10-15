import { once } from 'node:events';
import { createServer, type Server } from 'node:http';

import { Envapter, PortableSource } from 'envapt';
import { describe, expect, it } from 'vitest';

import { Seedcord } from '#src/edge/Seedcord';
import { toWebRequest, writeWebResponse } from '#src/node/webBridge';
import { registerBakedIds } from '#tests/helpers/bakedIds';
import { createSigner, type Signer } from '#tests/helpers/ed25519';
import { VALID_TOKEN } from '#tests/helpers/fixtures';

import type { AddressInfo } from 'node:net';

type Handle = (request: Request) => Promise<Response>;

interface ReadySeedcord extends AsyncDisposable {
    readonly signer: Signer;
    readonly url: string;
}

async function startServer(handle: Handle): Promise<Server> {
    const server = createServer((incoming, outgoing) => {
        void (async () => {
            const response = await handle(await toWebRequest(incoming));
            await writeWebResponse(response, outgoing);
        })().catch((error: unknown) => {
            // a swallowed throw would hang the client fetch to the test timeout with no cause
            outgoing.destroy(Error.isError(error) ? error : new Error(String(error)));
        });
    });

    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    return server;
}

function urlOf(server: Server): string {
    // justified: address() is AddressInfo once a TCP server is listening
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${String(port)}`;
}

async function readySeedcord(): Promise<ReadySeedcord> {
    const signer = await createSigner();
    Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: VALID_TOKEN }));
    const bakedIds = registerBakedIds({ publicKey: signer.publicKeyHex });
    // @ts-expect-error singleton reset between bots
    Seedcord.reset();
    // any engine works behind the bridge. the edge one needs no server of its own
    const seedcord = new Seedcord({
        bot: { interactions: { path: null }, commands: { path: null } },
        subscribers: { path: null }
    });
    const server = await startServer((request) => seedcord.fetch(request));
    return {
        signer,
        url: urlOf(server),
        [Symbol.asyncDispose]: async () => {
            bakedIds[Symbol.dispose]();
            await server[Symbol.asyncDispose]();
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

    it('delivers the request bytes unmodified', async () => {
        const sent = new Uint8Array(256).map((_, index) => index);
        let received: Uint8Array | null = null;

        await using server = await startServer(async (request) => {
            received = new Uint8Array(await request.arrayBuffer());
            return new Response(null, { status: 202 });
        });

        await post(urlOf(server), sent, { 'content-type': 'application/octet-stream' });

        expect(received).toEqual(sent);
    });

    it('writes status and headers for a bodyless response', async () => {
        await using server = await startServer(() =>
            Promise.resolve(new Response(null, { status: 405, headers: { allow: 'POST' } }))
        );

        const response = await fetch(urlOf(server));

        expect(response.status).toBe(405);
        expect(response.headers.get('allow')).toBe('POST');
        await expect(response.text()).resolves.toBe('');
    });

    it('preserves multiple set-cookie headers as separate headers', async () => {
        await using server = await startServer(() => {
            const headers = new Headers();
            headers.append('set-cookie', 'a=1; Path=/; Expires=Wed, 09 Jun 2027 10:18:14 GMT');
            headers.append('set-cookie', 'b=2; Path=/');
            return Promise.resolve(new Response(null, { status: 204, headers }));
        });

        const response = await fetch(urlOf(server));

        expect(response.headers.getSetCookie()).toEqual([
            'a=1; Path=/; Expires=Wed, 09 Jun 2027 10:18:14 GMT',
            'b=2; Path=/'
        ]);
    });
});
