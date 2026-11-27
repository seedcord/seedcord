import { once } from 'node:events';
import { mkdirSync, mkdtempDisposableSync, writeFileSync } from 'node:fs';
import { Agent, get as get_ } from 'node:http';
import { connect, createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

import { SeedcordErrorCode } from '@seedcord/errors';
import { captureLogs } from '@seedcord/logger/internal';
import { beforeAll, describe, expect, it, onTestFinished } from 'vite-plus/test';

import { WebServer } from '#node/WebServer';

import type { WebServerOptions } from '#node/WebServer';
import type { ServerConfig } from '@seedcord/types';
import type { DevServer } from '@seedcord/types/internal';
import type { IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Duplex } from 'node:stream';

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
    dev?: DevServer;
    clientDir?: string;
}

// a chunk on localhost arrives well inside this
const STREAM_WAIT_MS = 500;
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
        interactions: setup.interactions,
        dev: () => setup.dev,
        clientDir: setup.clientDir
    });
}

interface Listening extends AsyncDisposable {
    readonly server: WebServer;
    readonly url: string;
}

async function listening(setup: Setup = {}): Promise<Listening> {
    const server = webServer(setup);
    await server.serve(undefined);
    return {
        server,
        url: `http://127.0.0.1:${String(server.port)}`,
        [Symbol.asyncDispose]: () => server.close()
    };
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

    it('sends a request that discord signed to the interactions before any plugin', async () => {
        const seen: string[] = [];
        const server = webServer({
            config: MOUNTED,
            answer: () => {
                seen.push('plugins');
                return Promise.resolve(new Response('plugin'));
            },
            interactions: () => {
                seen.push('interactions');
                return Promise.resolve(new Response(null, { status: 202 }));
            }
        });
        await server.serve(undefined);

        const signed = new Request('http://bot.test/', {
            method: 'POST',
            headers: { 'x-signature-ed25519': 'ab', 'x-signature-timestamp': '1' },
            body: '{}'
        });
        const response = await server.fetch(signed);

        expect(response.status).toBe(202);
        expect(seen).toEqual(['interactions']);
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
        await using bot = await listening();
        const { server, url } = bot;

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

    it.each<[string, Partial<Setup>]>([
        ['built pages', { clientDir: tmpdir() }],
        [
            'the seedcord dev server',
            { dev: { serve: () => Promise.resolve(false), upgrade: () => false, closeSockets: () => undefined } }
        ]
    ])('listens with health off for %s', async (_case, extra) => {
        await using bot = await listening({ config: { ...LOCAL, health: false }, answersRequests: false, ...extra });

        expect(bot.server.port).toBeTypeOf('number');
    });

    it('warns when the built pages folder is missing', () => {
        using logs = captureLogs();
        const missing = join(tmpdir(), 'seedcord-no-such-client');

        webServer({ clientDir: missing });

        expect(logs.at('warn')).toEqual([expect.stringContaining(missing)]);
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
        await using bot = await listening({
            config: { ...LOCAL, bodyLimit: 16 },
            answer: (request) => {
                seen.push(request.url);
                return Promise.resolve(undefined);
            }
        });

        const response = await fetch(bot.url, { method: 'POST', body: new Uint8Array(32) });

        expect(response.status).toBe(413);
        expect(seen).toEqual([]);
    });

    it('passes the request bytes through unchanged', async () => {
        const sent = new Uint8Array(256).map((_, index) => index);
        let received: Uint8Array | undefined;
        await using bot = await listening({
            answer: async (request) => {
                received = new Uint8Array(await request.arrayBuffer());
                return new Response(null, { status: 202 });
            }
        });

        await fetch(bot.url, { method: 'POST', body: sent });

        expect(received).toEqual(sent);
    });

    it('answers 500 when answering a request throws', async () => {
        using _logs = captureLogs();
        await using bot = await listening({ answer: () => Promise.reject(new Error('boom')) });

        const response = await fetch(bot.url).then(
            ({ status }) => status,
            () => 'connection dropped'
        );

        expect(response).toBe(500);
    });

    it('closes the connection when a response stream fails after its status went out', async () => {
        using _logs = captureLogs();
        const fail = Promise.withResolvers<undefined>();
        const failing = new ReadableStream<Uint8Array>({
            start: (controller) => controller.enqueue(new TextEncoder().encode('first')),
            pull: async (controller) => {
                await fail.promise;
                controller.error(new Error('boom'));
            }
        });
        await using bot = await listening({ answer: () => Promise.resolve(new Response(failing)) });

        const response = await fetch(bot.url);
        const reader = response.body?.getReader();
        await reader?.read();
        fail.resolve(undefined);
        const rest = await reader?.read().then(
            () => 'read to the end',
            () => 'connection closed'
        );

        expect([response.status, rest]).toEqual([200, 'connection closed']);
    });

    it('sends a streamed response chunk by chunk, and cancels the stream when the client leaves', async () => {
        const encoder = new TextEncoder();
        const cancelled = Promise.withResolvers<string>();
        await using bot = await listening({
            answer: () => {
                const stream = new ReadableStream<Uint8Array>({
                    // like a server-sent events stream, this one never closes
                    start: (controller) => controller.enqueue(encoder.encode('first')),
                    cancel: () => cancelled.resolve('cancelled')
                });
                return Promise.resolve(new Response(stream));
            }
        });
        const client = new AbortController();

        const firstChunk = fetch(bot.url, { signal: client.signal })
            .then((response) => response.body?.pipeThrough(new TextDecoderStream()).getReader().read())
            .then((chunk) => chunk?.value);
        const first = await Promise.race([firstChunk, sleep(STREAM_WAIT_MS).then(() => 'nothing arrived')]);
        client.abort();
        const afterAbort = await Promise.race([cancelled.promise, sleep(STREAM_WAIT_MS).then(() => 'still open')]);

        expect([first, afterAbort]).toEqual(['first', 'cancelled']);
    });

    it('closes a kept-alive connection once its stream ends after close() started', async () => {
        let stream!: ReadableStreamDefaultController<string>;
        const events = new ReadableStream<string>({
            start: (opened) => {
                stream = opened;
                opened.enqueue('first');
            }
        });
        const bot = await listening({
            answer: () => Promise.resolve(new Response(events.pipeThrough(new TextEncoderStream())))
        });
        // a browser keeps the connection open for its next request, like this agent
        const agent = new Agent({ keepAlive: true });
        onTestFinished(() => agent.destroy());
        const response = await new Promise<IncomingMessage>((resolve) => {
            get_(`${bot.url}/events`, { agent }, resolve).on('error', () => undefined);
        });
        await once(response, 'data');

        const closing = bot.server.close().then(() => 'closed');
        stream.close();
        response.resume();

        await expect(Promise.race([closing, sleep(STREAM_WAIT_MS).then(() => 'still open')])).resolves.toBe('closed');
    });

    it('writes the status and headers of an empty response', async () => {
        await using bot = await listening({
            answer: () => Promise.resolve(new Response(null, { status: 418, headers: { 'x-a': '1' } }))
        });

        const response = await fetch(bot.url);

        expect(response.status).toBe(418);
        expect(response.headers.get('x-a')).toBe('1');
        await expect(response.text()).resolves.toBe('');
    });

    it('keeps each set-cookie header separate', async () => {
        await using bot = await listening({
            answer: () => {
                const headers = new Headers();
                headers.append('set-cookie', 'a=1; Path=/; Expires=Wed, 09 Jun 2027 10:18:14 GMT');
                headers.append('set-cookie', 'b=2; Path=/');
                return Promise.resolve(new Response(null, { status: 204, headers }));
            }
        });

        const response = await fetch(bot.url);

        expect(response.headers.getSetCookie()).toEqual([
            'a=1; Path=/; Expires=Wed, 09 Jun 2027 10:18:14 GMT',
            'b=2; Path=/'
        ]);
    });

    it('logs a localhost address when it binds every interface', async () => {
        using logs = captureLogs();
        await using _bot = await listening({ config: { port: 0 } });

        const listened = logs.at('info').join('\n');
        expect(listened).toContain('http://localhost:');
        expect(listened).not.toContain('0.0.0.0');
    });
});

describe('WebServer under seedcord dev', () => {
    // vite answers /@vite/client and passes every other request on to the bot. this stand-in never closes a socket it takes
    function viteStandIn(upgrades: string[]): DevServer {
        const held = new Set<Duplex>();
        return {
            serve: (request, response) => {
                if (request.url !== '/@vite/client') return Promise.resolve(false);
                response.writeHead(200).end('vite client');
                return Promise.resolve(true);
            },
            upgrade: (request, socket) => {
                if (request.headers['sec-websocket-protocol'] !== 'vite-hmr') return false;
                upgrades.push(request.url ?? '');
                held.add(socket);
                socket.write('HTTP/1.1 101 Switching Protocols\r\n\r\n');
                return true;
            },
            closeSockets: () => held.forEach((socket) => socket.destroy())
        };
    }

    // resolves with the first reply, or with '' once the bot closes the socket without one
    function upgrade(url: string, protocol: string): { reply: Promise<string>; closed: Promise<void> } {
        const socket = connect(Number(new URL(url).port), '127.0.0.1', () => {
            socket.write(
                `GET /socket HTTP/1.1\r\nHost: localhost\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n` +
                    `Sec-WebSocket-Protocol: ${protocol}\r\n\r\n`
            );
        });
        onTestFinished(() => void socket.destroy());
        const closed = once(socket, 'close').then(() => undefined);
        const reply = Promise.race([
            once(socket, 'data').then(([chunk]: Buffer[]) => String(chunk)),
            closed.then(() => '')
        ]);
        return { reply, closed };
    }

    it('lets vite answer first and sends the bot what vite passes on', async () => {
        await using bot = await listening({ dev: viteStandIn([]) });

        const [client, page] = await Promise.all([fetch(`${bot.url}/@vite/client`), fetch(`${bot.url}/page`)]);

        expect(await Promise.all([client.text(), page.text()])).toEqual(['vite client', 'page']);
    });

    it('hands vite its sockets and closes any other upgrade', async () => {
        const upgrades: string[] = [];
        await using bot = await listening({ dev: viteStandIn(upgrades) });

        const vite = await upgrade(bot.url, 'vite-hmr').reply;
        const other = await upgrade(bot.url, 'chat').reply;

        expect(vite).toContain('101 Switching Protocols');
        expect(other).toBe('');
        expect(upgrades).toEqual(['/socket']);
    });

    it("closes while a browser holds one of vite's sockets", async () => {
        const bot = await listening({ dev: viteStandIn([]) });
        const browser = upgrade(bot.url, 'vite-hmr');
        await browser.reply;

        await bot.server.close();

        await expect(browser.closed).resolves.toBeUndefined();
    });
});

describe('WebServer with a built client folder', () => {
    let server: WebServer;

    beforeAll(async () => {
        const folder = mkdtempDisposableSync(join(tmpdir(), 'seedcord-client-'));
        mkdirSync(join(folder.path, 'assets'));
        writeFileSync(join(folder.path, 'assets', 'page.css'), 'body {}');
        writeFileSync(join(folder.path, 'page'), 'a file the plugin route shares a path with');
        mkdirSync(join(folder.path, 'uptime'));
        writeFileSync(join(folder.path, 'uptime', 'index.html'), '<p>uptime</p>');
        server = webServer({
            config: MOUNTED,
            clientDir: folder.path,
            answer: () => Promise.resolve(new Response('plugin'))
        });
        await server.serve(undefined);
        return () => folder.remove();
    });

    it('answers a file in the folder before the plugins, with its content type and a long cache for assets/', async () => {
        const [css, shadowed, head] = await Promise.all([
            server.fetch(get('/assets/page.css')),
            server.fetch(get('/page')),
            server.fetch(new Request('http://bot.test/assets/page.css', { method: 'HEAD' }))
        ]);

        expect([css.headers.get('content-type'), await css.text()]).toEqual(['text/css', 'body {}']);
        expect(css.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
        expect(await shadowed.text()).toBe('a file the plugin route shares a path with');
        expect(shadowed.headers.get('cache-control')).toBeNull();
        expect([head.headers.get('content-length'), await head.text()]).toEqual(['7', '']);
    });

    it("answers a page folder with its index.html, and redirects the folder's path and its index.html", async () => {
        const [page, moved, index] = await Promise.all([
            server.fetch(get('/uptime/')),
            server.fetch(get('/uptime?tab=1')),
            server.fetch(get('/uptime/index.html?tab=1'))
        ]);

        expect([page.headers.get('content-type'), await page.text()]).toEqual(['text/html', '<p>uptime</p>']);
        expect([moved.status, moved.headers.get('location')]).toEqual([307, '/uptime/?tab=1']);
        expect([index.status, index.headers.get('location')]).toEqual([307, '/uptime/?tab=1']);
    });

    it.each([
        ['a missing file', get('/assets/missing.css')],
        ['a folder without an index.html', get('/assets')],
        ['a POST', new Request('http://bot.test/assets/page.css', { method: 'POST' })],
        ['a path that escapes the folder', get('/..%2Fsecret')],
        ['a malformed escape', get('/%E0')],
        ['a NUL byte', get('/%00')]
    ])('sends %s on to the plugins', async (_case, request) => {
        const response = await server.fetch(request);

        expect(await response.text()).toBe('plugin');
    });
});
