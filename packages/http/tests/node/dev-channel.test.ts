import path from 'node:path';

import { setDevChannel } from '@seedcord/core/internal';
import { afterEach, describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { bindSignedEnv, serverConfig } from '#tests/helpers/nodeHost';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');

describe('http dev channel', () => {
    afterEach(() => {
        setDevChannel(undefined);
    });

    it('reports the bound port once the server is listening', async () => {
        const sent: [string, unknown][] = [];
        setDevChannel({ send: (event, data) => sent.push([event, data]), on: () => undefined });

        await bindSignedEnv();
        await using host = new Seedcord(serverConfig({ interactions: { path: HANDLERS_DIR } }));
        await host.start();

        expect(sent).toContainEqual(['seedcord:server-listening', { port: host.port }]);
    });
});
