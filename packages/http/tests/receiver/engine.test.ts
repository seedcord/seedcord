import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { Envapter, PortableSource } from 'envapt';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSeedcord } from '@src/createSeedcord';

import { createSigner, type Signer } from '../helpers/ed25519';
import { emptyManifest, nullPathConfig, VALID_TOKEN } from '../helpers/fixtures';

const encoder = new TextEncoder();

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

function bindEnv(vars: Record<string, string>): void {
    Envapter.useSource(new PortableSource(vars));
}

async function readySeedcord(): Promise<{ signer: Signer; handle: (request: Request) => Promise<Response> }> {
    const signer = await createSigner();
    bindEnv({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN });
    return { signer, handle: createSeedcord(nullPathConfig, emptyManifest()) };
}

interface SignedRequestInit {
    path?: string;
    timestamp?: string;
}

async function signedRequest(signer: Signer, payload: string, init: SignedRequestInit = {}): Promise<Request> {
    const timestamp = init.timestamp ?? String(nowSeconds());
    const body = encoder.encode(payload);
    const signature = await signer.sign(timestamp, body);

    return new Request(`https://bot.example${init.path ?? '/interactions'}`, {
        method: 'POST',
        headers: {
            'x-signature-ed25519': signature,
            'x-signature-timestamp': timestamp
        },
        body
    });
}

const ping = '{"type":1}';
// a type resolve() does not recognize, the one payload class the engine acks without dispatching
const unrecognized = '{"type":99}';

describe('createSeedcord request logging', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('names why each request got its status', async () => {
        const debug = vi.spyOn(Logger.prototype, 'debug').mockReturnValue(undefined);
        const { handle } = await readySeedcord();

        await handle(new Request('https://bot.example/interactions', { method: 'POST' }));

        expect(debug.mock.calls[0]?.[0]).toContain('unsigned');
    });
});

describe('createSeedcord', () => {
    it('answers a signed PING with an in-body PONG', async () => {
        const { signer, handle } = await readySeedcord();

        const response = await handle(await signedRequest(signer, ping));

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ type: 1 });
    });

    // discord resends the same signed ping while verifying an endpoint, and a 401 reads as a broken endpoint
    it('answers a resent PING instead of rejecting it as a replay', async () => {
        const { signer, handle } = await readySeedcord();
        const signed = await signedRequest(signer, ping);

        await handle(signed.clone());
        const resent = await handle(signed);

        expect(resent.status).toBe(200);
        await expect(resent.json()).resolves.toEqual({ type: 1 });
    });

    it('acks an unrecognized interaction shape with an empty 202', async () => {
        const { signer, handle } = await readySeedcord();

        const response = await handle(await signedRequest(signer, unrecognized));

        expect(response.status).toBe(202);
        await expect(response.text()).resolves.toBe('');
    });

    it('ignores the request path', async () => {
        const { signer, handle } = await readySeedcord();

        const response = await handle(await signedRequest(signer, ping, { path: '/some/other/route' }));

        expect(response.status).toBe(200);
    });

    it('rejects a signature from another key with 401', async () => {
        const { handle } = await readySeedcord();
        const impostor = await createSigner();

        const response = await handle(await signedRequest(impostor, ping));

        expect(response.status).toBe(401);
    });

    it('rejects missing signature headers with 401', async () => {
        const { handle } = await readySeedcord();

        const response = await handle(new Request('https://bot.example/interactions', { method: 'POST', body: ping }));

        expect(response.status).toBe(401);
    });

    it.each([
        ['timestamp', { 'x-signature-ed25519': 'ab'.repeat(64) }],
        ['signature', { 'x-signature-timestamp': '1752350000' }]
    ])('rejects a request missing the %s header with 401', async (_label, headers) => {
        const { handle } = await readySeedcord();

        const response = await handle(
            new Request('https://bot.example/interactions', { method: 'POST', headers, body: ping })
        );

        expect(response.status).toBe(401);
    });

    it('rejects a stale timestamp with 401', async () => {
        const { signer, handle } = await readySeedcord();
        const stale = String(nowSeconds() - 301);

        const response = await handle(await signedRequest(signer, ping, { timestamp: stale }));

        expect(response.status).toBe(401);
    });

    it('rejects an exact replay with 401', async () => {
        const { signer, handle } = await readySeedcord();
        const timestamp = String(nowSeconds());

        const first = await handle(await signedRequest(signer, unrecognized, { timestamp }));
        const second = await handle(await signedRequest(signer, unrecognized, { timestamp }));

        expect(first.status).toBe(202);
        expect(second.status).toBe(401);
    });

    it('rejects a signed but malformed JSON body with 400', async () => {
        const { signer, handle } = await readySeedcord();

        const response = await handle(await signedRequest(signer, 'not json'));

        expect(response.status).toBe(400);
    });

    it('rejects a signed payload without an interaction type with 400', async () => {
        const { signer, handle } = await readySeedcord();

        const response = await handle(await signedRequest(signer, '{"hello":"world"}'));

        expect(response.status).toBe(400);
    });

    it('rejects a non-POST method with 405', async () => {
        const { handle } = await readySeedcord();

        const response = await handle(new Request('https://bot.example/interactions'));

        expect(response.status).toBe(405);
        expect(response.headers.get('allow')).toBe('POST');
    });

    it('throws ConfigMissingPublicKey when the env var is unset', () => {
        bindEnv({ DISCORD_BOT_TOKEN: VALID_TOKEN });

        try {
            createSeedcord(nullPathConfig, emptyManifest());
            expect.unreachable('createSeedcord should throw');
        } catch (error) {
            expect(isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.ConfigMissingPublicKey)).toBe(true);
        }
    });

    it('throws ConfigIncorrectPublicKey when the env var is malformed', () => {
        bindEnv({ DISCORD_PUBLIC_KEY: 'zz'.repeat(32), DISCORD_BOT_TOKEN: VALID_TOKEN });

        try {
            createSeedcord(nullPathConfig, emptyManifest());
            expect.unreachable('createSeedcord should throw');
        } catch (error) {
            expect(isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.ConfigIncorrectPublicKey)).toBe(true);
        }
    });

    it('throws ConfigMissingDiscordToken when the bot token env var is unset', () => {
        bindEnv({ DISCORD_PUBLIC_KEY: 'ab'.repeat(32) });

        try {
            createSeedcord(nullPathConfig, emptyManifest());
            expect.unreachable('createSeedcord should throw');
        } catch (error) {
            expect(isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.ConfigMissingDiscordToken)).toBe(true);
        }
    });
});
