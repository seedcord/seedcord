import path from 'node:path';

import { shutdownOf } from '@seedcord/core/node/internal';
import { Logger } from '@seedcord/logger';
import { Envapter, merge, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { createSigner, type Signer } from '#tests/helpers/ed25519';
import { VALID_TOKEN } from '#tests/helpers/fixtures';

import { slowGateEntered } from './discovery/fixtures/handlers/SlowGateCommand';

import type { HttpConfig } from '#src/interfaces/Config';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');
const DRAIN_HANDLERS_DIR = path.resolve(__dirname, './fixtures/drain-handlers');

function config(handlers: string = HANDLERS_DIR): HttpConfig {
    return {
        bot: { interactions: { path: handlers }, commands: { path: null } },
        subscribers: { path: null },
        port: 0
    };
}

function reset(): void {
    // @ts-expect-error singleton reset between tests
    Seedcord.reset();
}

let live: Seedcord | undefined;

async function readyHost(handlers?: string): Promise<{ signer: Signer; url: string; host: Seedcord }> {
    const signer = await createSigner();
    Envapter.useSource(
        merge(
            new PortableSource(process.env),
            new PortableSource({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN })
        )
    );
    const host = new Seedcord(config(handlers));
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

describe('http Seedcord shutdown', () => {
    beforeEach(reset);

    afterEach(async () => {
        if (live) await shutdownOf(live).run(0, false);
        live = undefined;
        reset();
        vi.restoreAllMocks();
    });

    it('installs no signal handlers until start', async () => {
        const base = [process.listenerCount('SIGTERM'), process.listenerCount('SIGINT')];

        // eslint-disable-next-line no-new -- construction is the behavior under test
        new Seedcord(config());
        expect([process.listenerCount('SIGTERM'), process.listenerCount('SIGINT')]).toEqual(base);
        reset();

        await readyHost();
        expect([process.listenerCount('SIGTERM'), process.listenerCount('SIGINT')]).toEqual(
            base.map((count) => count + 1)
        );
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
        await slowGateEntered.promise;
        const closing = shutdownOf(host).run(0, false);

        const response = await pending;
        expect(response.status).toBe(202);
        // the gate held the ack past the shutdown start. A fast 202 would prove nothing
        expect(Date.now() - started).toBeGreaterThan(250);
        await closing;
    });

    it('completes the shutdown when a handler outlives the drain window, and says how many it left', async () => {
        const errors = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        const warns = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const { signer, url, host } = await readyHost(DRAIN_HANDLERS_DIR);
        const body = encoder.encode(
            JSON.stringify({
                type: 2,
                id: '1',
                token: 'interaction-token',
                application_id: '2',
                app_permissions: '0',
                data: { type: 1, name: 'drainhang', options: [] }
            })
        );

        const response = await fetch(url, { method: 'POST', headers: await signedHeaders(signer, body), body });
        expect(response.status).toBe(202);

        await shutdownOf(host).run(0, false);

        const failed = errors.mock.calls.some((call) => call.some((arg) => String(arg).includes('shutdown failed')));
        expect(failed).toBe(false);

        const counted = warns.mock.calls.some((call) => call.some((arg) => String(arg).includes('1 still running')));
        expect(counted).toBe(true);
    });
});
