import { once } from 'node:events';
import { createServer } from 'node:net';

import { SeedcordErrorCode } from '@seedcord/errors';
import { captureLogs } from '@seedcord/logger/internal';
import { describe, expect, it } from 'vite-plus/test';

import { WebServer } from '#node/WebServer';

import type { WebServerOptions } from '#node/WebServer';
import type { ServerConfig } from '@seedcord/types';
import type { AddressInfo } from 'node:net';

interface Startup {
    isReady: boolean;
    hasBegun: boolean;
}

interface Setup {
    config?: ServerConfig;
    startup?: Startup;
    answer?: (request: Request) => Promise<Response | undefined>;
    answersRequests?: boolean;
    interactions?: WebServerOptions['interactions'];
}

const LOCAL: ServerConfig = { port: 0, host: '127.0.0.1' };
const MOUNTED: ServerConfig = { port: false };

function page(request: Request): Promise<Response | undefined> {
    const isPage = new URL(request.url).pathname === '/page';
    return Promise.resolve(isPage ? new Response('page') : undefined);
}

function webServer(setup: Setup = {}): WebServer {
    const { config = LOCAL, startup = { isReady: true, hasBegun: true }, answer = page } = setup;
    return new WebServer({
        config: () => config,
        shutdown: { addTask: () => undefined },
        startup,
        plugins: { answer, answersRequests: setup.answersRequests ?? true },
        interactions: setup.interactions
    });
}

async function listening(server: WebServer): Promise<string> {
    await server.serve(undefined);
    return `http://127.0.0.1:${String(server.port)}`;
}

const get = (path: string): Request => new Request(`http://bot.test${path}`);

describe('WebServer requests', () => {
    it('throws CoreFetchBeforeStart before startup begins', async () => {
        const server = webServer({ startup: { isReady: false, hasBegun: false } });

        await expect(server.fetch(get('/health'))).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreFetchBeforeStart
        });
    });

    it('answers health with 503 while starting and 200 once ready even before it opens', async () => {
        const startup = { isReady: false, hasBegun: true };
        const server = webServer({ startup });

        const starting = await server.fetch(get('/health'));
        startup.isReady = true;
        const ready = await server.fetch(get('/health'));

        expect([starting.status, ready.status]).toEqual([503, 200]);
    });

    it('answers health on the configured path only', async () => {
        const server = webServer({ config: { port: false, health: '/healthz' } });
        await server.serve(undefined);

        const moved = await server.fetch(get('/healthz'));
        const old = await server.fetch(get('/health'));

        expect([moved.status, old.status]).toEqual([200, 404]);
    });

    it('holds other requests until it serves, then runs the plugins before the interactions', async () => {
        const seen: string[] = [];
        const server = webServer({
            config: MOUNTED,
            answer: (request) => {
                seen.push(`plugins ${new URL(request.url).pathname}`);
                return Promise.resolve(undefined);
            },
            interactions: (request) => {
                seen.push(`interactions ${new URL(request.url).pathname}`);
                return Promise.resolve(new Response(null, { status: 202 }));
            }
        });

        const pending = server.fetch(get('/other'));
        await Promise.resolve();
        const heldBeforeServe = [...seen];
        await server.serve(undefined);
        const response = await pending;

        expect(heldBeforeServe).toEqual([]);
        expect(response.status).toBe(202);
        expect(seen).toEqual(['plugins /other', 'interactions /other']);
    });

    it('answers 503 to health and every other request once closed', async () => {
        const server = webServer({ config: MOUNTED });
        await server.serve(undefined);
        await server.close();

        const health = await server.fetch(get('/health'));
        const answered = await server.fetch(get('/page'));

        expect([health.status, answered.status]).toEqual([503, 503]);
    });
});

describe('WebServer on a port', () => {
    it('answers on its port, then closes without hanging when closed twice at once', async () => {
        const server = webServer();
        const url = await listening(server);

        const answered = await fetch(`${url}/page`);
        const passed = await fetch(`${url}/other`);

        expect([await answered.text(), passed.status]).toEqual(['page', 404]);
        await expect(Promise.all([server.close(), server.close()])).resolves.toEqual([undefined, undefined]);
        await expect(server.close()).resolves.toBeUndefined();
    });

    it('resolves close() when it never listened', async () => {
        await expect(webServer().close()).resolves.toBeUndefined();
    });

    it.each<[string, Setup]>([
        ['port: false', { config: MOUNTED }],
        ['health off and nothing else to answer', { config: { ...LOCAL, health: false }, answersRequests: false }]
    ])("doesn't listen with %s", async (_case, setup) => {
        const server = webServer(setup);

        await server.serve(undefined);

        expect(server.port).toBeUndefined();
    });

    it('throws PortInUse with the config key when another process holds the port', async () => {
        await using holder = createServer().listen(0, '127.0.0.1');
        await once(holder, 'listening');
        // justified: address() is AddressInfo once a TCP server is listening
        const { port } = holder.address() as AddressInfo;

        await expect(webServer({ config: { port, host: '127.0.0.1' } }).serve(undefined)).rejects.toMatchObject({
            code: SeedcordErrorCode.PortInUse,
            message: expect.stringContaining('server.port') as string
        });
    });

    it('answers 413 to a body past bodyLimit and never runs the plugins', async () => {
        const seen: string[] = [];
        const server = webServer({
            config: { ...LOCAL, bodyLimit: 16 },
            answer: (request) => {
                seen.push(request.url);
                return Promise.resolve(undefined);
            }
        });
        const url = await listening(server);

        const response = await fetch(url, { method: 'POST', body: new Uint8Array(32) });
        await server.close();

        expect(response.status).toBe(413);
        expect(seen).toEqual([]);
    });

    it('passes the request bytes through unchanged', async () => {
        const sent = new Uint8Array(256).map((_, index) => index);
        let received: Uint8Array | undefined;
        const server = webServer({
            answer: async (request) => {
                received = new Uint8Array(await request.arrayBuffer());
                return new Response(null, { status: 202 });
            }
        });
        const url = await listening(server);

        await fetch(url, { method: 'POST', body: sent });
        await server.close();

        expect(received).toEqual(sent);
    });

    it('writes the status and headers of an empty response', async () => {
        const server = webServer({
            answer: () => Promise.resolve(new Response(null, { status: 418, headers: { 'x-a': '1' } }))
        });
        const url = await listening(server);

        const response = await fetch(url);
        await server.close();

        expect(response.status).toBe(418);
        expect(response.headers.get('x-a')).toBe('1');
        await expect(response.text()).resolves.toBe('');
    });

    it('keeps each set-cookie header separate', async () => {
        const server = webServer({
            answer: () => {
                const headers = new Headers();
                headers.append('set-cookie', 'a=1; Path=/; Expires=Wed, 09 Jun 2027 10:18:14 GMT');
                headers.append('set-cookie', 'b=2; Path=/');
                return Promise.resolve(new Response(null, { status: 204, headers }));
            }
        });
        const url = await listening(server);

        const response = await fetch(url);
        await server.close();

        expect(response.headers.getSetCookie()).toEqual([
            'a=1; Path=/; Expires=Wed, 09 Jun 2027 10:18:14 GMT',
            'b=2; Path=/'
        ]);
    });

    it('logs a localhost address when it binds every interface', async () => {
        using logs = captureLogs();
        const server = webServer({ config: { port: 0 } });

        await server.serve(undefined);
        await server.close();

        const listened = logs.at('info').join('\n');
        expect(listened).toContain('http://localhost:');
        expect(listened).not.toContain('0.0.0.0');
    });
});
