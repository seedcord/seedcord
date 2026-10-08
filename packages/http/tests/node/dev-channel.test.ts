import path from 'node:path';

import { setDevChannel } from '@seedcord/core/internal';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { bindSignedEnv, resetSeedcord, serverConfig, stopHost } from '#tests/helpers/nodeHost';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');

let live: Seedcord | undefined;

describe('http dev channel', () => {
    beforeEach(resetSeedcord);

    afterEach(async () => {
        await stopHost(live);
        live = undefined;
        setDevChannel(undefined);
    });

    it('reports the bound port once the server is listening', async () => {
        const sent: [string, unknown][] = [];
        setDevChannel({ send: (event, data) => sent.push([event, data]), on: () => undefined });

        await bindSignedEnv();
        const host = new Seedcord(serverConfig({ interactions: { path: HANDLERS_DIR } }));
        live = host;
        await host.start();

        expect(sent).toContainEqual(['seedcord:server-listening', { port: host.port }]);
    });
});
