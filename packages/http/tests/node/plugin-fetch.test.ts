import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { shutdownOf } from '@seedcord/core/node/internal';
import { Plugin } from '@seedcord/core/plugin';
import { SeedcordErrorCode } from '@seedcord/errors';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { captureLogs } from '@seedcord/logger/internal';
import { describe, expect, it } from 'vite-plus/test';

import { Seedcord } from '#src/node/Seedcord';
import { signedRequest } from '#tests/helpers/ed25519';
import { bindSignedEnv, serverConfig } from '#tests/helpers/nodeHost';

import type { HttpServerConfig } from '#src/interfaces/Config';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');
const PING = '{"type":1}';
// a shutdown with nothing to wait for finishes well inside this
const STILL_OPEN_MS = 300;

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

class BodyReaderThatThrows extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }

    public override async fetch(request: Request): Promise<never> {
        await request.text();
        throw new Error('boom');
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

const ROUTE_LOG = 'answered from the route';

class Logs extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }

    public override fetch(): Response {
        this.logger.info(ROUTE_LOG);
        return new Response('logged');
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
        ['reads the body and passes the request on', BodyReader],
        ['locks the body with a reader', BodyLocker]
    ])('throws when a plugin %s', async (_case, Reader) => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord(config()).attach('reader', Reader);
        await host.start();
        using _logs = captureLogs();

        await expect(host.fetch(await signedRequest(signer, PING))).rejects.toThrow(
            expect.objectContaining({
                code: SeedcordErrorCode.CorePluginFetchReadBody,
                message: expect.stringContaining(`${Reader.name} at reader`) as string
            })
        );
    });

    it('holds a shutdown open for a log sink that a plugin route started', async () => {
        const release = Promise.withResolvers<undefined>();
        await bindSignedEnv();
        await using host = new Seedcord(config()).attach('logs', Logs);
        await host.start();
        using _sink = LoggerChannelRegistry.instance.installSink({
            kind: 'capture',
            onLog: ({ message }) => (message === ROUTE_LOG ? release.promise : undefined)
        });

        await host.fetch(new Request('http://bot.test/page'));
        const closing = shutdownOf(host)
            .run(0, false)
            .then(() => 'closed');
        const whileSinkRuns = await Promise.race([closing, sleep(STILL_OPEN_MS).then(() => 'still open')]);
        release.resolve(undefined);

        expect([whileSinkRuns, await closing]).toEqual(['still open', 'closed']);
    });

    it.each([
        ['throws', Thrower],
        ['reads the body and throws', BodyReaderThatThrows]
    ])('answers 500 when a plugin %s, and the plugins after it never run', async (_case, Broken) => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord(config()).attach('broken', Broken).attach('pages', Pages);
        await host.start();
        using logs = captureLogs();

        const page = await host.fetch(new Request('http://bot.test/page?token=secret', { method: 'POST', body: 'x' }));
        const interaction = await host.fetch(await signedRequest(signer, PING));

        expect([page.status, interaction.status]).toEqual([500, 500]);
        const logged = logs.at('error').join('\n');
        expect(logged).toContain('POST /page');
        expect(logged).not.toContain('secret');
        expect(logs.argsAt('error')).toContainEqual(expect.objectContaining({ message: 'boom' }));
    });
});
