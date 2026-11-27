import { HostPlugins } from '@seedcord/types/internal';
import { describe, expect, it, onTestFinished } from 'vite-plus/test';

import { setDevChannel } from '#hmr/devChannel';
import { Plugin } from '#src/plugin/Plugin';
import { TestPluginHost } from '#tests/utils/TestPluginHost';

import type { CliChannel } from '#hmr/devChannel';

const PAGE = '<html><head></head><body>page</body></html>';
// html can leave out both closing tags
const BARE_PAGE = '<!doctype html><title>bare</title><p>page';
// İ lowercases to two characters
const TURKISH_PAGE = '<!doctype html><title>İstanbul</title></head><p>page';

class Pages extends Plugin {
    public init(): void {}

    public override fetch(request: Request): Response {
        const { pathname } = new URL(request.url);
        if (pathname === '/data') return Response.json({ html: false });
        if (pathname === '/cached')
            return new Response(null, { status: 304, headers: { 'content-type': 'text/html' } });
        if (pathname === '/gzip') {
            return new Response('compressed', { headers: { 'content-type': 'text/html', 'content-encoding': 'gzip' } });
        }
        if (pathname === '/bare') return new Response(BARE_PAGE, { headers: { 'content-type': 'text/html' } });
        if (pathname === '/turkish') return new Response(TURKISH_PAGE, { headers: { 'content-type': 'text/html' } });
        return new Response(PAGE, {
            status: 201,
            headers: { 'content-type': 'text/html; charset=utf-8', 'x-from-plugin': 'yes' }
        });
    }
}

// justified: the manager only calls on() here, and the fake answers every call the same way
const quietChannel = { send: () => undefined, on: () => undefined, off: () => undefined } as unknown as CliChannel;

function hostWith(underDev: boolean): TestPluginHost {
    setDevChannel(underDev ? quietChannel : undefined);
    onTestFinished(() => setDevChannel(undefined));
    const host = new TestPluginHost();
    host.attach('pages', Pages);
    return host;
}

describe('a plugin page under seedcord dev', () => {
    it("adds vite's client to the head and keeps the plugin's status and headers", async () => {
        const response = await hostWith(true)[HostPlugins].answer(new Request('http://bot.test/home'));

        expect(await response?.text()).toBe(
            '<html><head><script type="module" src="/@vite/client"></script></head><body>page</body></html>'
        );
        expect(response?.status).toBe(201);
        expect(response?.headers.get('x-from-plugin')).toBe('yes');
    });

    it('keeps the doctype first without closing tags, and finds </head> after any characters', async () => {
        const host = hostWith(true);
        const client = '<script type="module" src="/@vite/client"></script>';

        const [bare, turkish] = await Promise.all(
            ['/bare', '/turkish'].map((path) =>
                host[HostPlugins].answer(new Request(`http://bot.test${path}`)).then((page) => page?.text())
            )
        );

        expect(bare).toBe(BARE_PAGE + client);
        expect(turkish).toBe(TURKISH_PAGE.replace('</head>', `${client}</head>`));
    });

    it('leaves json, a 304 without a body, and a compressed page as the plugin sent them', async () => {
        const host = hostWith(true);

        const [data, cached, gzip] = await Promise.all([
            host[HostPlugins].answer(new Request('http://bot.test/data')),
            host[HostPlugins].answer(new Request('http://bot.test/cached')),
            host[HostPlugins].answer(new Request('http://bot.test/gzip'))
        ]);

        expect(await data?.json()).toEqual({ html: false });
        expect(cached?.status).toBe(304);
        expect(await gzip?.text()).toBe('compressed');
    });

    it('returns the page as the plugin sent it outside seedcord dev', async () => {
        const response = await hostWith(false)[HostPlugins].answer(new Request('http://bot.test/home'));

        expect(await response?.text()).toBe(PAGE);
    });
});
