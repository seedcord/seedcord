import { once } from 'node:events';
import { createServer } from 'node:net';

import { SeedcordErrorCode } from '@seedcord/errors';
import { Logger } from '@seedcord/logger';
import { captureLogs } from '@seedcord/logger/internal';
import { describe, expect, it } from 'vite-plus/test';

import { HealthResponder } from '#node/HealthResponder';
import { WebServer } from '#node/WebServer';

import type { WebServerOptions } from '#node/WebServer';
import type { AddressInfo } from 'node:net';

interface Startup {
    isReady: boolean;
    hasBegun: boolean;
}

const started = (): Startup => ({ isReady: true, hasBegun: true });

function webServer(overrides: Partial<WebServerOptions> = {}): WebServer {
    return new WebServer({
        logger: new Logger('Server'),
        shutdown: { addTask: () => undefined },
        startup: started(),
        health: new HealthResponder(),
        plugins: (request) => {
            const page = new URL(request.url).pathname === '/page';
            return Promise.resolve(page ? new Response('page') : undefined);
        },
        tail: () => Promise.resolve(new Response(null, { status: 404 })),
        portSetting: 'server.port',
        ...overrides
    });
}

async function listening(server: WebServer): Promise<string> {
    const port = await server.serve({ port: 0, host: '127.0.0.1' });
    return `http://127.0.0.1:${String(port)}`;
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

    it('holds other requests until it opens, then runs the plugins before the tail', async () => {
        const seen: string[] = [];
        const server = webServer({
            plugins: (request) => {
                seen.push(`plugins ${new URL(request.url).pathname}`);
                return Promise.resolve(undefined);
            },
            tail: (request) => {
                seen.push(`tail ${new URL(request.url).pathname}`);
                return Promise.resolve(new Response(null, { status: 404 }));
            }
        });

        const pending = server.fetch(get('/other'));
        await Promise.resolve();
        const heldBeforeOpen = [...seen];
        await server.serve(undefined);
        const response = await pending;

        expect(heldBeforeOpen).toEqual([]);
        expect(response.status).toBe(404);
        expect(seen).toEqual(['plugins /other', 'tail /other']);
    });

    it('answers 503 to health and every other request once closed', async () => {
        const server = webServer();
        await server.serve(undefined);
        await server.close();

        const health = await server.fetch(get('/health'));
        const page = await server.fetch(get('/page'));

        expect([health.status, page.status]).toEqual([503, 503]);
    });
});

describe('WebServer on a port', () => {
    it('answers through fetch, then closes without hanging', async () => {
        const server = webServer();
        const url = await listening(server);

        const page = await fetch(`${url}/page`);

        expect(await page.text()).toBe('page');
        await expect(Promise.all([server.close(), server.close()])).resolves.toBeDefined();
        await expect(server.close()).resolves.toBeUndefined();
    });

    it('resolves close() when it never listened', async () => {
        await expect(webServer().close()).resolves.toBeUndefined();
    });

    it('throws PortInUse with the setting name when another process holds the port', async () => {
        await using holder = createServer().listen(0, '127.0.0.1');
        await once(holder, 'listening');
        // justified: address() is AddressInfo once a TCP server is listening
        const { port } = holder.address() as AddressInfo;

        await expect(webServer().serve({ port, host: '127.0.0.1' })).rejects.toMatchObject({
            code: SeedcordErrorCode.PortInUse,
            message: expect.stringContaining('server.port') as string
        });
    });

    it('answers 413 to a body past 1 MiB and never runs the plugins', async () => {
        const seen: string[] = [];
        const server = webServer({
            plugins: (request) => {
                seen.push(request.url);
                return Promise.resolve(undefined);
            }
        });
        const url = await listening(server);

        const response = await fetch(url, { method: 'POST', body: new Uint8Array(2 * 1_048_576) });
        await server.close();

        expect(response.status).toBe(413);
        expect(seen).toEqual([]);
    });

    it('passes the request bytes through unchanged', async () => {
        const sent = new Uint8Array(256).map((_, index) => index);
        let received: Uint8Array | undefined;
        const server = webServer({
            plugins: async (request) => {
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
            plugins: () => Promise.resolve(new Response(null, { status: 418, headers: { 'x-a': '1' } }))
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
            plugins: () => {
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
        const server = webServer();

        await server.serve({ port: 0, host: undefined });
        await server.close();

        const listened = logs.at('info').join('\n');
        expect(listened).toContain('http://localhost:');
        expect(listened).not.toContain('0.0.0.0');
    });
});
