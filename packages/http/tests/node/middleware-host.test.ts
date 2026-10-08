import path from 'node:path';

import { shutdownOf } from '@seedcord/core/node/internal';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { signedHeaders } from '#tests/helpers/ed25519';
import { slashPayload } from '#tests/helpers/interactions';
import { bindSignedEnv, resetSeedcord, serverConfig, stopHost } from '#tests/helpers/nodeHost';

import { ran } from './discovery/fixtures/middlewares/recorder';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');
const MIDDLEWARES_DIR = path.resolve(__dirname, './discovery/fixtures/middlewares');

let live: Seedcord | undefined;

beforeEach(() => {
    resetSeedcord();
    ran.length = 0;
});

afterEach(async () => {
    await stopHost(live);
    live = undefined;
});

describe('the http host and its middleware directory', () => {
    it('runs a middleware loaded from the configured directory', async () => {
        const signer = await bindSignedEnv();
        const host = new Seedcord(serverConfig({ interactions: { path: HANDLERS_DIR, middlewares: MIDDLEWARES_DIR } }));
        live = host;
        await host.start();

        const body = new TextEncoder().encode(JSON.stringify(slashPayload('ping')));
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
