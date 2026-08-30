import path from 'node:path';

import { setDevChannel } from '@seedcord/core/internal';
import { shutdownOf } from '@seedcord/core/node/internal';
import { Envapter, merge, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';

import { createSigner } from '../helpers/ed25519';
import { VALID_TOKEN } from '../helpers/fixtures';

import type { HttpServerConfig } from '#src/interfaces/Config';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');

function config(): HttpServerConfig {
    return {
        bot: { interactions: { path: HANDLERS_DIR }, commands: { path: null } },
        subscribers: { path: null },
        port: 0
    };
}

function reset(): void {
    // @ts-expect-error singleton reset between tests
    Seedcord.reset();
}

let live: Seedcord | undefined;

describe('http dev channel', () => {
    beforeEach(reset);

    afterEach(async () => {
        if (live) await shutdownOf(live).run(0, false);
        live = undefined;
        setDevChannel(undefined);
        reset();
    });

    it('reports the bound port once the server is listening', async () => {
        const sent: [string, unknown][] = [];
        setDevChannel({ send: (event, data) => sent.push([event, data]), on: () => undefined });

        const signer = await createSigner();
        Envapter.useSource(
            merge(
                new PortableSource(process.env),
                new PortableSource({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN })
            )
        );
        const host = new Seedcord(config());
        live = host;
        await host.start();

        expect(sent).toContainEqual(['seedcord:server-listening', { port: host.port }]);
    });
});
