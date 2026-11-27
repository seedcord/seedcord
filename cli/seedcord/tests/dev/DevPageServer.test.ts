import { once } from 'node:events';
import { createServer as createHttpServer } from 'node:http';

import { createServer } from 'vite';
import { beforeAll, describe, expect, it } from 'vite-plus/test';

import { DevPageServer } from '#commands/dev/runtime/DevPageServer';
import { serverViteConfig } from '#commands/dev/runtime/devServerConfig';
import { mergeViteConfig } from '#core/modules/userCodeConfig';
import { ProjectFiles } from '#core/project/ProjectFiles';
import { resolvedConfigOf } from '#tests/resolvedConfigOf';
import { tempProject } from '#tests/tempProject';

import type { AddressInfo } from 'node:net';

const BOT_FILES = {
    'seedcord.config.ts': 'export const secret = "config";\n',
    'package.json': '{"name":"bot"}\n',
    'src/bot.ts': 'export const token = "secret";\n',
    'public/robots.txt': 'User-agent: *\n'
};
const PAGES = {
    'client/index.html': '<html><head></head><body>home</body></html>',
    'client/uptime/index.html':
        '<html><head></head><body><script type="module" src="./main.ts"></script></body></html>',
    'client/uptime/main.ts': "import { greeting } from '../greeting.ts';\ndocument.title = greeting;\n",
    'client/greeting.ts': "export const greeting = 'hi';\n",
    'client/notes.html': '<p>notes</p>'
};

interface Served extends AsyncDisposable {
    pageServer: DevPageServer;
    url: string;
}

// stands in for a node bot's web server, which hands vite its requests and sockets first
async function served(files: Record<string, string>): Promise<Served> {
    const resources = new AsyncDisposableStack();
    const { root } = resources.use(await tempProject(files));

    const config = resolvedConfigOf(root);
    const project = new ProjectFiles(config);
    const pageServer = await DevPageServer.open(
        (sockets) =>
            createServer(
                mergeViteConfig(serverViteConfig(config, project.layout, sockets), {
                    logLevel: 'silent',
                    plugins: [project.client.vitePlugin({ edge: false })],
                    server: { watch: null }
                })
            ),
        project.client.hasPages
    );
    resources.defer(() => pageServer.vite.close());
    const bot = createHttpServer((request, response) => {
        void pageServer.serve(request, response).then((handled) => {
            if (!handled) response.end(`the bot got ${request.url ?? ''}`);
        });
    });
    bot.on('upgrade', (request, socket, head) => {
        if (!pageServer.upgrade(request, socket, head)) socket.destroy();
    });
    bot.listen(0, '127.0.0.1');
    await once(bot, 'listening');
    resources.defer(() => bot.closeAllConnections());
    resources.use(bot);
    // justified: address() is AddressInfo once a TCP server is listening
    const url = `127.0.0.1:${String((bot.address() as AddressInfo).port)}`;
    const stack = resources.move();
    return { pageServer, url, [Symbol.asyncDispose]: () => stack.disposeAsync() };
}

describe('DevPageServer with pages in client/', () => {
    let pageServer: DevPageServer;
    let url: string;

    beforeAll(async () => {
        const started = await served({ ...BOT_FILES, ...PAGES });
        ({ pageServer, url } = started);
        return () => started[Symbol.asyncDispose]();
    });

    it("serves a page at its folder's path with vite's client, and redirects the path without a slash", async () => {
        const [moved, index, page, home] = await Promise.all([
            fetch(`http://${url}/uptime?tab=1`, { redirect: 'manual' }),
            fetch(`http://${url}/uptime/index.html?tab=1`, { redirect: 'manual' }),
            fetch(`http://${url}/uptime/`).then((response) => response.text()),
            fetch(`http://${url}/`).then((response) => response.text())
        ]);

        expect([moved.status, moved.headers.get('location')]).toEqual([307, '/uptime/?tab=1']);
        expect([index.status, index.headers.get('location')]).toEqual([307, '/uptime/?tab=1']);
        expect(page).toContain('/@vite/client');
        expect(home).toContain('home');
    });

    it("serves a page's own modules, the modules they import and the public folder", async () => {
        const [main, greeting, robots] = await Promise.all(
            ['/uptime/main.ts', '/client/greeting.ts', '/robots.txt'].map((path) =>
                fetch(`http://${url}${path}`).then((response) => response.text())
            )
        );

        expect(main).toContain('/client/greeting.ts');
        expect(greeting).toContain('export const greeting');
        expect(robots).toBe(BOT_FILES['public/robots.txt']);
    });

    it("refuses the bot's source and config, and passes the bot's own routes on", async () => {
        const statuses = await Promise.all(
            [
                '/seedcord.config.ts',
                '/package.json',
                '/src/bot.ts',
                `/@fs${pageServer.vite.config.root}/src/bot.ts`
            ].map((path) => fetch(`http://${url}${path}`).then((response) => response.status))
        );
        const botPaths = ['/api/pings', '/%00', '/notes.html'];
        const routes = await Promise.all(
            botPaths.map((path) => fetch(`http://${url}${path}`).then((response) => response.text()))
        );
        const post = await fetch(`http://${url}/uptime/`, { method: 'POST', body: '{}' });

        expect(statuses).toEqual([403, 403, 403, 403]);
        expect(routes).toEqual(botPaths.map((path) => `the bot got ${path}`));
        expect(await post.text()).toBe('the bot got /uptime/');
    });

    it('opens the socket that the browser pings while it waits for the dev server to come back', async () => {
        const socket = new WebSocket(`ws://${url}/`, 'vite-ping');
        const opened = await new Promise((resolve) => {
            socket.addEventListener('open', () => resolve(true));
            socket.addEventListener('error', () => resolve(false));
        });

        expect(opened).toBe(true);
        socket.close();
    });

    // last because closeSockets() closes every socket that the server holds
    it("connects the browser's hmr socket to vite, and closes it with closeSockets()", async () => {
        const socket = new WebSocket(`ws://${url}/`, 'vite-hmr');
        const connected = new Promise((resolve) =>
            socket.addEventListener('message', ({ data }) => resolve(JSON.parse(String(data))))
        );
        const closed = new Promise((resolve) => socket.addEventListener('close', resolve));

        expect(await connected).toEqual({ type: 'connected' });
        pageServer.closeSockets();
        await expect(closed).resolves.toBeDefined();
    });
});

describe('DevPageServer without pages', () => {
    it("refuses public/ and the bot's source", async () => {
        await using started = await served(BOT_FILES);

        const [robots, source] = await Promise.all([
            fetch(`http://${started.url}/robots.txt`),
            fetch(`http://${started.url}/src/bot.ts`)
        ]);

        expect(await robots.text()).toBe('the bot got /robots.txt');
        expect(source.status).toBe(403);
    });
});
