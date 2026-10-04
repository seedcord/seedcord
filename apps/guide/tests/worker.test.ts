import { describe, expect, it } from 'vitest';

// eslint-disable-next-line no-restricted-imports -- the app root has no alias
import handler from '../worker';

type Assets = Parameters<typeof handler.fetch>[1];

function serving(response: Response): Assets {
    return { ASSETS: { fetch: () => Promise.resolve(response) } };
}

const NOT_FOUND = 404;

// only the paths the export actually wrote answer
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

const GUIDE = 'https://seedcord.org/guide';

function html(): Response {
    return new Response('<!doctype html>', { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

function get(path: string, assets: Assets): Promise<Response> {
    return handler.fetch(new Request(`${GUIDE}${path}`), assets);
}

function asking(path: string, accept: string): Request {
    return new Request(`${GUIDE}${path}`, { headers: { accept } });
}

describe('the guide worker', () => {
    it('advertises the reference site and the home page to an agent', async () => {
        const response = await get('/tooling/', serving(html()));

        expect(response.headers.get('Link')).toContain('rel="service-doc"');
    });

    it('reads a request for the bare guide path as the guide root', async () => {
        const response = await get('', serving(html()));

        expect(response.headers.get('Link')).toContain('</guide/index.md>; rel="alternate"');
    });

    it('points an agent at the markdown for the page it is reading', async () => {
        const response = await get('/commands/options/', serving(html()));

        expect(response.headers.get('Link')).toContain(
            '</guide/commands/options.md>; rel="alternate"; type="text/markdown"'
        );
    });

    it('points an agent at the index describing the whole guide', async () => {
        const response = await get('/tooling/', serving(html()));

        expect(response.headers.get('Link')).toContain('</guide/llms.txt>; rel="describedby"');
    });

    it('leaves the Link header off an asset that is not a page', async () => {
        const png = new Response('', { headers: { 'content-type': 'image/png' } });

        const response = await get('/some.png', serving(png));

        expect(response.headers.get('Link')).toBeNull();
    });

    it('names the type of the extension-less search index next writes', async () => {
        const response = await get('/api/search', serving(new Response('{}')));

        expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('names the type of the extension-less png next writes for the favicon', async () => {
        const response = await get('/icon', serving(new Response('')));

        expect(response.headers.get('Content-Type')).toBe('image/png');
    });

    it('serves a page markdown at the page url plus .md', async () => {
        const assets = recording('/guide/llms/commands/options.md');

        const response = await get('/commands/options.md', assets);

        expect(assets.asked).toEqual(['/guide/commands/options.md', '/guide/llms/commands/options.md']);
        expect(await response.text()).toBe('# Options\n');
    });

    it('serves a page card at the page url plus .png', async () => {
        const assets = recording('/guide/og/commands/options.png');

        const response = await get('/commands/options.png', assets);

        expect(assets.asked).toEqual(['/guide/commands/options.png', '/guide/og/commands/options.png']);
        expect(response.status).toBe(200);
    });

    it('serves the root markdown and card at index', async () => {
        const twin = recording('/guide/llms/index.md');
        const card = recording('/guide/og/index.png');

        await get('/index.md', twin);
        await get('/index.png', card);

        expect(twin.asked.at(-1)).toBe('/guide/llms/index.md');
        expect(card.asked.at(-1)).toBe('/guide/og/index.png');
    });

    // a screenshot dropped in public/ keeps its own url
    it('leaves a real file alone', async () => {
        const assets = recording('/guide/portal-token.png');

        await get('/portal-token.png', assets);

        expect(assets.asked).toEqual(['/guide/portal-token.png']);
    });

    it('serves markdown to a client that asked for it', async () => {
        const assets = recording('/guide/llms/commands/options.md');

        const response = await handler.fetch(asking('/commands/options/', 'text/markdown'), assets);

        expect(assets.asked).toEqual(['/guide/llms/commands/options.md']);
        expect(response.headers.get('content-type')).toBe(MARKDOWN);
    });

    it('serves the markdown of the guide root', async () => {
        const assets = recording('/guide/llms/index.md');

        await handler.fetch(asking('/', 'text/markdown'), assets);

        expect(assets.asked).toEqual(['/guide/llms/index.md']);
    });

    // llms.txt is the url the Link header and the skill both point an agent at
    it('serves a real file to a client that asked for markdown', async () => {
        const assets = recording('/guide/llms.txt');

        const response = await handler.fetch(asking('/llms.txt', 'text/markdown, text/plain, */*'), assets);

        expect(response.status).toBe(200);
        expect(assets.asked).toEqual(['/guide/llms/llms.txt.md', '/guide/llms.txt']);
    });

    it('serves an image to a client that asked for markdown', async () => {
        const assets = recording('/guide/dev-narrow-layout.webp');

        const response = await handler.fetch(asking('/dev-narrow-layout.webp', 'text/markdown, */*'), assets);

        expect(response.status).toBe(200);
    });

    it('reads the q value that ranks markdown above html', async () => {
        const assets = recording('/guide/llms/commands/options.md');

        await handler.fetch(asking('/commands/options/', 'text/markdown;q=1, text/html;q=0.1'), assets);

        expect(assets.asked).toEqual(['/guide/llms/commands/options.md']);
    });

    it('treats a markdown q of zero as a refusal', async () => {
        const assets = recording('/guide/commands/options/');

        await handler.fetch(asking('/commands/options/', 'text/markdown;q=0, */*'), assets);

        expect(assets.asked).toEqual(['/guide/commands/options/']);
    });

    it('leaves a browser on the html page', async () => {
        const assets = recording('/guide/commands/options/');

        await handler.fetch(asking('/commands/options/', 'text/html,application/xhtml+xml'), assets);

        expect(assets.asked).toEqual(['/guide/commands/options/']);
    });

    it('tells a cache that the accept header changes the answer', async () => {
        const response = await get('/tooling/', serving(html()));

        expect(response.headers.get('Vary')).toBe('Accept');
    });

    // Vary splits a cache entry per accept header
    it('leaves Vary off an asset that never negotiates', async () => {
        const script = new Response('', { headers: { 'content-type': 'application/javascript' } });

        const response = await get('/_next/static/chunk.js', serving(script));

        expect(response.headers.get('Vary')).toBeNull();
    });

    it('turns the redirect onto the trailing slash into a permanent one', async () => {
        const temporary = new Response(null, { status: 307, headers: { location: '/guide/tooling/' } });

        const response = await get('/tooling', serving(temporary));

        expect(response.status).toBe(308);
        expect(response.headers.get('location')).toBe('/guide/tooling/');
    });

    it('sends a renamed page to where it moved', async () => {
        const response = await get('/throwing/faults/', recording());

        expect(response.status).toBe(308);
        expect(response.headers.get('location')).toBe('/guide/replying/faults/');
    });

    it('answers a renamed page without asking for the file', async () => {
        const assets = recording();

        await get('/utilities/', assets);

        expect(assets.asked).toEqual([]);
    });

    it('leaves a live page alone', async () => {
        const response = await get('/commands/options/', serving(html()));

        expect(response.status).toBe(200);
    });

    it('sends a renamed page twin to the new twin without asking for the file', async () => {
        const assets = recording();

        const response = await get('/gates/permissions.md', assets);

        expect(response.status).toBe(308);
        expect(response.headers.get('location')).toBe('/guide/checks/permissions.md');
        expect(assets.asked).toEqual([]);
    });
});
