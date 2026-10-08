import path from 'node:path';

import { shutdownOf } from '@seedcord/core/node/internal';
import { beforeEach, describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { slashPayload } from '#tests/helpers/interactions';
import { bindSignedEnv, postSigned, serverConfig } from '#tests/helpers/nodeHost';

import { ran } from './discovery/fixtures/middlewares/recorder';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');
const MIDDLEWARES_DIR = path.resolve(__dirname, './discovery/fixtures/middlewares');

beforeEach(() => {
    ran.length = 0;
});

describe('the http host and its middleware directory', () => {
    it('runs a middleware loaded from the configured directory', async () => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord(
            serverConfig({ interactions: { path: HANDLERS_DIR, middlewares: MIDDLEWARES_DIR } })
        );
        await host.start();

        const response = await postSigned(host, signer, JSON.stringify(slashPayload('ping')));
        expect(response.status).toBe(202);

        // shutdown drains the dispatch the 202 left running
        await shutdownOf(host).run(0, false);

        expect(ran).toEqual(['Audit']);
    });
});
