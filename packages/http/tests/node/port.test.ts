import { createServer } from 'node:http';
import path from 'node:path';

import { Envapter, merge, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Seedcord } from '@src/node/Seedcord';

import { createSigner } from '../helpers/ed25519';
import { VALID_TOKEN } from '../helpers/fixtures';

import type { HttpServerConfig } from '@src/interfaces/Config';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');

function config(port: number): HttpServerConfig {
    return {
        bot: { interactions: { path: HANDLERS_DIR }, commands: { path: null } },
        subscribers: { path: null },
        port
    };
}

function reset(): void {
    // @ts-expect-error singleton reset between tests
    Seedcord.reset();
}

function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const probe = createServer();
        probe.once('error', reject);
        probe.listen(0, '127.0.0.1', () => {
            // justified: address() is AddressInfo once a TCP server is listening
            const { port } = probe.address() as { port: number };
            probe.close(() => resolve(port));
        });
    });
}

let live: Seedcord | undefined;

async function startHost(port: number): Promise<Seedcord> {
    const signer = await createSigner();
    Envapter.useSource(
        merge(
            new PortableSource(process.env),
            new PortableSource({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN })
        )
    );
    const host = new Seedcord(config(port));
    live = host;
    await host.start();
    return host;
}

describe('http server port', () => {
    beforeEach(reset);

    afterEach(async () => {
        await live?.shutdown.run(0, false);
        live = undefined;
        reset();
    });

    it('binds the port the config declares', async () => {
        const port = await freePort();

        const host = await startHost(port);

        expect(host.port).toBe(port);
    });
});
