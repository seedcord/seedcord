import { createServer } from 'node:http';
import path from 'node:path';

import { Envapter, merge, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Seedcord } from '@src/node/Seedcord';

import { createSigner } from '../helpers/ed25519';
import { VALID_TOKEN } from '../helpers/fixtures';

import type { HttpConfig } from '@src/interfaces/Config';
import type { Server } from 'node:http';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');

function config(healthCheckPort: number): HttpConfig {
    return {
        bot: { interactions: { path: HANDLERS_DIR }, commands: { path: null } },
        subscribers: { path: null },
        healthCheck: { port: healthCheckPort }
    };
}

function reset(): void {
    // @ts-expect-error singleton reset between tests
    Seedcord.reset();
}

function occupyPort(): Promise<{ server: Server; port: number }> {
    return new Promise((resolveListen) => {
        const server = createServer();
        server.listen(0, () => {
            // justified: address() is AddressInfo once a TCP server is listening
            const { port } = server.address() as { port: number };
            resolveListen({ server, port });
        });
    });
}

let live: Seedcord | undefined;
let blocker: Server | undefined;

describe('http Seedcord startup failure', () => {
    beforeEach(reset);

    afterEach(async () => {
        await live?.shutdown.run(0, false);
        live = undefined;
        const server = blocker;
        if (server) await new Promise((resolveClose) => server.close(() => resolveClose(undefined)));
        blocker = undefined;
        reset();
    });

    it('closes the interaction server when a later startup task rejects', async () => {
        const signer = await createSigner();
        Envapter.useSource(
            merge(
                new PortableSource(process.env),
                new PortableSource({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN })
            )
        );
        const occupied = await occupyPort();
        blocker = occupied.server;

        const host = new Seedcord(config(occupied.port));
        live = host;

        // the server task binds before the health task hits the occupied port
        await expect(host.start(0)).rejects.toThrow();
        expect(host.port).toBeDefined();

        await expect(fetch(`http://127.0.0.1:${String(host.port)}`, { method: 'POST' })).rejects.toThrow();
    });

    it('rejects a restart of a failed host, the rollback removed its signal handlers', async () => {
        const signer = await createSigner();
        Envapter.useSource(
            merge(
                new PortableSource(process.env),
                new PortableSource({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN })
            )
        );
        const occupied = await occupyPort();
        blocker = occupied.server;

        const host = new Seedcord(config(occupied.port));
        live = host;
        await expect(host.start(0)).rejects.toThrow();

        // the health port is free now, a restart would bind and run without coordinated shutdown
        await new Promise((resolveClose) => occupied.server.close(() => resolveClose(undefined)));
        blocker = undefined;

        await expect(host.start(0)).rejects.toThrow(/new instance/);
    });
});
