import { describe, expect, it, vi } from 'vite-plus/test';

import { Seedcord } from '#src/node/Seedcord';
import { Plugin } from '#src/Plugin';
import { bindSignedEnv, serverConfig } from '#tests/helpers/nodeHost';

async function healthStatus(host: Seedcord): Promise<number> {
    const response = await fetch(`http://127.0.0.1:${String(host.port)}/health`);
    return response.status;
}

describe('the health path on a node http bot', () => {
    it('serves plugin routes while a plugin is still getting ready, with health at 503 until startup finishes', async () => {
        const { promise: readyStarted, resolve: markReadyStarted } = Promise.withResolvers<undefined>();
        const { promise: readyGate, resolve: finishReady } = Promise.withResolvers<undefined>();
        class SlowReady extends Plugin {
            public init(): Promise<void> {
                return Promise.resolve();
            }

            public override ready(): Promise<void> {
                markReadyStarted(undefined);
                return readyGate;
            }

            public override fetch(request: Request): Response | undefined {
                return new URL(request.url).pathname === '/page' ? new Response('page') : undefined;
            }
        }
        await bindSignedEnv();
        await using host = new Seedcord(serverConfig()).attach('slow', SlowReady);

        const starting = host.start();
        await readyStarted;
        await vi.waitFor(() => expect(host.port).toBeDefined());
        const whileReadying = await healthStatus(host);
        const page = await fetch(`http://127.0.0.1:${String(host.port)}/page`);
        finishReady(undefined);
        await starting;

        expect([whileReadying, await page.text(), await healthStatus(host)]).toEqual([503, 'page', 200]);
    });

    it('leaves the path to the interactions server with health: false', async () => {
        await bindSignedEnv();
        await using host = await new Seedcord({ ...serverConfig(), server: { port: 0, health: false } }).start();

        expect(await healthStatus(host)).toBe(404);
    });
});
