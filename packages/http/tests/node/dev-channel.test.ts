import path from 'node:path';

import { setDevChannel } from '@seedcord/core/internal';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { Seedcord } from '#src/node/Seedcord';
import { bindSignedEnv, serverConfig } from '#tests/helpers/nodeHost';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');

describe('http dev channel', () => {
    afterEach(() => {
        setDevChannel(undefined);
    });

    it.each([
        ['the bound port once the server is listening', 0],
        ['false when the config turns the server off', false]
    ] as const)('reports %s', async (_label, port) => {
        const sent: [string, unknown][] = [];
        setDevChannel({ send: (event, data) => sent.push([event, data]), on: () => undefined, off: () => undefined });

        await bindSignedEnv();
        await using host = new Seedcord({ ...serverConfig({ interactions: { path: HANDLERS_DIR } }), port });
        await host.start();

        expect(sent).toContainEqual(['seedcord:server-port', { port: host.port ?? false }]);
    });
});
