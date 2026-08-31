import { describe, expect, it } from 'vitest';

import handler from '../worker';

type Assets = Parameters<typeof handler.fetch>[1];

function serving(response: Response): Assets {
    return { ASSETS: { fetch: () => Promise.resolve(response) } };
}

const NOT_FOUND = 404;

// only the paths the export actually wrote answer, everything else misses
function recording(...present: string[]): Assets & { asked: string[] } {
    const asked: string[] = [];
    return {
        asked,
        ASSETS: {
            fetch: (request: Request) => {
                const { pathname } = new URL(request.url);
                asked.push(pathname);
                if (!present.includes(pathname)) return Promise.resolve(new Response('', { status: NOT_FOUND }));
                return Promise.resolve(new Response('# Options\n', { headers: { 'content-type': MARKDOWN } }));
            }
        }
    };
}

const MARKDOWN = 'text/markdown; charset=utf-8';

function html(): Response {
    return new Response('<!doctype html>', { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

function get(url: string, assets: Assets): Promise<Response> {
    return handler.fetch(new Request(url), assets);
}

describe('the guide worker', () => {
    it('lets a crawler index a page', async () => {
        const response = await get('https://guide.seedcord.org/tooling/', serving(html()));

        expect(response.headers.get('X-Robots-Tag')).toBeNull();
    });

    it('advertises the reference site and the home page to an agent', async () => {
        const response = await get('https://guide.seedcord.org/tooling/', serving(html()));

        expect(response.headers.get('Link')).toContain('rel="service-doc"');
    });

    it('points an agent at the markdown for the page it is reading', async () => {
        const response = await get('https://guide.seedcord.org/commands/options/', serving(html()));

        expect(response.headers.get('Link')).toContain('</commands/options.md>; rel="alternate"; type="text/markdown"');
    });

    it('points an agent at the index describing the whole guide', async () => {
        const response = await get('https://guide.seedcord.org/tooling/', serving(html()));

        expect(response.headers.get('Link')).toContain('</llms.txt>; rel="describedby"');
    });

    it('leaves the Link header off an asset that is not a page', async () => {
        const png = new Response('', { headers: { 'content-type': 'image/png' } });

        const response = await get('https://guide.seedcord.org/some.png', serving(png));

        expect(response.headers.get('Link')).toBeNull();
    });

    it('names the type of the extension-less search index next writes', async () => {
        const untyped = new Response('{}');

        const response = await get('https://guide.seedcord.org/api/search', serving(untyped));

        expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('names the type of the extension-less png next writes for the favicon', async () => {
        const untyped = new Response('');

        const response = await get('https://guide.seedcord.org/icon', serving(untyped));

        expect(response.headers.get('Content-Type')).toBe('image/png');
    });

    it('serves a page markdown at the page url plus .md', async () => {
        const assets = recording('/llms/commands/options.md');

        const response = await get('https://guide.seedcord.org/commands/options.md', assets);

        expect(assets.asked).toEqual(['/commands/options.md', '/llms/commands/options.md']);
        expect(await response.text()).toBe('# Options\n');
    });

    it('serves a page card at the page url plus .png', async () => {
        const assets = recording('/og/commands/options.png');

        const response = await get('https://guide.seedcord.org/commands/options.png', assets);

        expect(assets.asked).toEqual(['/commands/options.png', '/og/commands/options.png']);
        expect(response.status).toBe(200);
    });

    it('serves the root markdown and card at index', async () => {
        const twin = recording('/llms/index.md');
        const card = recording('/og/index.png');

        await get('https://guide.seedcord.org/index.md', twin);
        await get('https://guide.seedcord.org/index.png', card);

        expect(twin.asked.at(-1)).toBe('/llms/index.md');
        expect(card.asked.at(-1)).toBe('/og/index.png');
    });

    // a screenshot dropped in public/ keeps its own url
    it('leaves a real file alone', async () => {
        const assets = recording('/portal-token.png');

        await get('https://guide.seedcord.org/portal-token.png', assets);

        expect(assets.asked).toEqual(['/portal-token.png']);
    });

    it('serves markdown to a client that asked for it', async () => {
        const assets = recording('/llms/commands/options.md');
        const request = new Request('https://guide.seedcord.org/commands/options/', {
            headers: { accept: 'text/markdown' }
        });

        const response = await handler.fetch(request, assets);

        expect(assets.asked).toEqual(['/llms/commands/options.md']);
        expect(response.headers.get('content-type')).toBe(MARKDOWN);
    });

    it('leaves a browser on the html page', async () => {
        const assets = recording('/commands/options/');
        const request = new Request('https://guide.seedcord.org/commands/options/', {
            headers: { accept: 'text/html,application/xhtml+xml' }
        });

        await handler.fetch(request, assets);

        expect(assets.asked).toEqual(['/commands/options/']);
    });

    it('tells a cache that the accept header changes the answer', async () => {
        const response = await get('https://guide.seedcord.org/tooling/', serving(html()));

        expect(response.headers.get('Vary')).toBe('Accept');
    });

    // Vary splits a cache entry per accept header
    it('leaves Vary off an asset that never negotiates', async () => {
        const script = new Response('', { headers: { 'content-type': 'application/javascript' } });

        const response = await get('https://guide.seedcord.org/_next/static/chunk.js', serving(script));

        expect(response.headers.get('Vary')).toBeNull();
    });

    it('turns the redirect onto the trailing slash into a permanent one', async () => {
        const temporary = new Response(null, { status: 307, headers: { location: '/tooling/' } });

        const response = await get('https://guide.seedcord.org/tooling', serving(temporary));

        expect(response.status).toBe(308);
        expect(response.headers.get('location')).toBe('/tooling/');
    });
});
