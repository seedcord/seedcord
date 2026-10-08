import { connect } from 'node:net';
import path from 'node:path';

import { shutdownOf } from '@seedcord/core/node/internal';
import { Logger } from '@seedcord/logger';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { signedHeaders, type Signer } from '#tests/helpers/ed25519';
import { slashPayload } from '#tests/helpers/interactions';
import { bindSignedEnv, postSigned, serverConfig } from '#tests/helpers/nodeHost';

import { whileGateHolds } from './discovery/fixtures/handlers/SlowGateCommand';

import type { HttpServerConfig } from '#src/interfaces/Config';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');
const DRAIN_HANDLERS_DIR = path.resolve(__dirname, './fixtures/drain-handlers');

function config(handlers: string = HANDLERS_DIR): HttpServerConfig {
    return serverConfig({ interactions: { path: handlers } });
}

function signalListeners(): number[] {
    return [process.listenerCount('SIGTERM'), process.listenerCount('SIGINT')];
}

const encoder = new TextEncoder();

// with Expect: 100-continue, node sends 100 Continue once it has read the headers
async function rawPost(signer: Signer, payload: string): Promise<{ head: string; body: string }> {
    const bytes = encoder.encode(payload);
    const signature = Object.entries(await signedHeaders(signer, bytes))
        .map(([name, value]) => `${name}: ${value}\r\n`)
        .join('');
    return {
        head: `POST / HTTP/1.1\r\nHost: localhost\r\nExpect: 100-continue\r\nContent-Length: ${String(bytes.length)}\r\n${signature}\r\n`,
        body: payload
    };
}

describe('http Seedcord shutdown', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('installs no signal handlers until start', async () => {
        const base = signalListeners();
        await bindSignedEnv();
        await using host = new Seedcord(config());

        expect(signalListeners()).toEqual(base);
        await host.start();
        expect(signalListeners()).toEqual(base.map((count) => count + 1));
    });

    it('answers 503 to a request whose body arrives after shutdown starts', async () => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord(config());
        await host.start();
        await using socket = connect(Number(host.port), '127.0.0.1');
        let received = '';
        socket.on('data', (chunk) => {
            received += String(chunk);
        });
        const { head, body } = await rawPost(signer, '{"type":1}');

        socket.write(head);
        await vi.waitFor(() => {
            expect(received).toContain('100 Continue');
        });
        const closing = shutdownOf(host).run(0, false);
        socket.write(body);

        await vi.waitFor(() => {
            expect(received).toContain('503 Service Unavailable');
        });
        await closing;
    });

    it('stops the server while a client keeps its connection open after a response', async () => {
        const errors = vi.spyOn(Logger.prototype, 'error');
        const signer = await bindSignedEnv();
        await using host = new Seedcord(config());
        await host.start();
        await using socket = connect(Number(host.port), '127.0.0.1');

        await whileGateHolds(
            async () => {
                const { head, body } = await rawPost(signer, JSON.stringify(slashPayload('slowping')));
                socket.write(head + body);
            },
            () => shutdownOf(host).run(0, false)
        );

        expect(errors).not.toHaveBeenCalled();
    });

    it('a request awaiting its ack survives a shutdown started mid-flight', async () => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord(config());
        await host.start();

        const started = Date.now();
        const [response] = await whileGateHolds(
            () => postSigned(host, signer, JSON.stringify(slashPayload('slowping'))),
            () => shutdownOf(host).run(0, false)
        );

        expect(response.status).toBe(202);
        // the gate held the ack past the shutdown start. A fast 202 would prove nothing
        expect(Date.now() - started).toBeGreaterThan(250);
    });

    it('completes the shutdown when a handler outlives the drain window, and says how many it left', async () => {
        const errors = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        const warns = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const signer = await bindSignedEnv();
        await using host = new Seedcord(config(DRAIN_HANDLERS_DIR));
        await host.start();

        const response = await postSigned(host, signer, JSON.stringify(slashPayload('drainhang')));
        expect(response.status).toBe(202);

        await shutdownOf(host).run(0, false);

        const failed = errors.mock.calls.some((call) => call.some((arg) => String(arg).includes('shutdown failed')));
        expect(failed).toBe(false);

        const counted = warns.mock.calls.some((call) => call.some((arg) => String(arg).includes('1 still running')));
        expect(counted).toBe(true);
    });
});
