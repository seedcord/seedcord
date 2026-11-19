import path from 'node:path';

import { Plugin } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { captureLogs } from '@seedcord/logger/internal';
import { describe, expect, it } from 'vite-plus/test';

import { Seedcord } from '#src/node/Seedcord';
import { signedRequest } from '#tests/helpers/ed25519';
import { bindSignedEnv, serverConfig } from '#tests/helpers/nodeHost';

import type { HttpServerConfig } from '#src/interfaces/Config';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');
const PING = '{"type":1}';

function config(): HttpServerConfig {
    return { ...serverConfig({ interactions: { path: HANDLERS_DIR } }), server: { port: false } };
}

class Pages extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }

    public override fetch(request: Request): Response | undefined {
        const { pathname } = new URL(request.url);
        if (pathname === '/page') return new Response(`${request.method} page`);
        return undefined;
    }
}

class BodyReader extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }

    public override async fetch(request: Request): Promise<undefined> {
        await request.text();
    }
}

class BodyLocker extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }

    public override fetch(request: Request): undefined {
        request.body?.getReader();
    }
}

class Thrower extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }

    public override fetch(): never {
        throw new Error('boom');
    }
}

describe('a plugin fetch method on node', () => {
    it.each([
        ['GET', null],
        ['POST', 'x']
    ])('answers a %s on its path', async (method, body) => {
        await bindSignedEnv();
        await using host = new Seedcord(config()).attach('pages', Pages);
        await host.start();

        const response = await host.fetch(new Request('http://bot.test/page', { method, body }));

        expect(await response.text()).toBe(`${method} page`);
    });

    it('sends a signed interaction past the plugins to the engine', async () => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord(config()).attach('pages', Pages);
        await host.start();

        const response = await host.fetch(await signedRequest(signer, PING));

        expect(await response.json()).toEqual({ type: 1 });
    });

    it('answers 404 for a GET that every plugin passes on', async () => {
        await bindSignedEnv();
        await using host = new Seedcord(config()).attach('pages', Pages);
        await host.start();

        const response = await host.fetch(new Request('http://bot.test/other'));

        expect(response.status).toBe(404);
    });

    it.each([
        ['reads the body', BodyReader],
        ['locks the body with a reader', BodyLocker]
    ])('throws when a plugin %s and passes the request on', async (_case, Reader) => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord(config()).attach('reader', Reader);
        await host.start();

        await expect(host.fetch(await signedRequest(signer, PING))).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CorePluginFetchReadBody })
        );
    });

    it('logs a throw from one plugin and keeps answering through the rest', async () => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord(config()).attach('thrower', Thrower).attach('pages', Pages);
        await host.start();
        using logs = captureLogs();

        const page = await host.fetch(new Request('http://bot.test/page?code=secret'));
        const interaction = await host.fetch(await signedRequest(signer, PING));

        expect(await page.text()).toBe('GET page');
        expect(await interaction.json()).toEqual({ type: 1 });
        // Discord puts an OAuth callback's code in the query
        const logged = logs.at('error').join('\n');
        expect(logged).toContain('GET /page');
        expect(logged).not.toContain('secret');
        expect(logs.argsAt('error')).toContainEqual(expect.objectContaining({ message: 'boom' }));
    });
});
