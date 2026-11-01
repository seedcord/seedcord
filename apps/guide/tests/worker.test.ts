import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import {
    embedding,
    GUIDE_SECTIONS_PATH,
    GUIDE_TITLES_PATH,
    GUIDE_VECTORS_PATH,
    QUESTION_LENGTH
} from '@seedcord/docs-search';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// eslint-disable-next-line no-restricted-imports -- the app root has no alias
import handler from '../worker';

type Env = Parameters<typeof handler.fetch>[1];

const PAGES_ONLY = {
    AI: { run: () => Promise.reject(new Error('a page request embedded a question')) },
    ASK_LIMIT: { limit: () => Promise.reject(new Error('a page request was rate limited')) }
};

function serving(response: Response): Env {
    return { ...PAGES_ONLY, ASSETS: { fetch: () => Promise.resolve(response) } };
}

const NOT_FOUND = 404;

// only the paths the export actually wrote answer
function recording(...present: string[]): Env & { asked: string[] } {
    const asked: string[] = [];
    return {
        ...PAGES_ONLY,
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

const pending: Promise<unknown>[] = [];
const CONTEXT = { waitUntil: (promise: Promise<unknown>) => void pending.push(promise) };

function send(request: Request, env: Env): Promise<Response> {
    return handler.fetch(request, env, CONTEXT);
}

function get(path: string, env: Env): Promise<Response> {
    return send(new Request(`${GUIDE}${path}`), env);
}

function asking(path: string, accept: string): Request {
    return new Request(`${GUIDE}${path}`, { headers: { accept } });
}

describe('search indexing', () => {
    it('is off on every host except production', async () => {
        const preview = await send(new Request('https://preview.seedcord.org/guide/'), serving(html()));
        const production = await get('/', serving(html()));

        expect(preview.headers.get('x-robots-tag')).toBe('noindex, nofollow');
        expect(production.headers.get('x-robots-tag')).toBeNull();
    });
});

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

    it('sets the content type of the extension-less png next writes for the favicon', async () => {
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

        const response = await send(asking('/commands/options/', 'text/markdown'), assets);

        expect(assets.asked).toEqual(['/guide/llms/commands/options.md']);
        expect(response.headers.get('content-type')).toBe(MARKDOWN);
    });

    it('serves the markdown of the guide root', async () => {
        const assets = recording('/guide/llms/index.md');

        await send(asking('/', 'text/markdown'), assets);

        expect(assets.asked).toEqual(['/guide/llms/index.md']);
    });

    // llms.txt is the url the Link header and the skill both point an agent at
    it('serves a real file to a client that asked for markdown', async () => {
        const assets = recording('/guide/llms.txt');

        const response = await send(asking('/llms.txt', 'text/markdown, text/plain, */*'), assets);

        expect(response.status).toBe(200);
        expect(assets.asked).toEqual(['/guide/llms/llms.txt.md', '/guide/llms.txt']);
    });

    it('serves an image to a client that asked for markdown', async () => {
        const assets = recording('/guide/dev-narrow-layout.webp');

        const response = await send(asking('/dev-narrow-layout.webp', 'text/markdown, */*'), assets);

        expect(response.status).toBe(200);
    });

    it('reads the q value that ranks markdown above html', async () => {
        const assets = recording('/guide/llms/commands/options.md');

        await send(asking('/commands/options/', 'text/markdown;q=1, text/html;q=0.1'), assets);

        expect(assets.asked).toEqual(['/guide/llms/commands/options.md']);
    });

    it('treats a markdown q of zero as a refusal', async () => {
        const assets = recording('/guide/commands/options/');

        await send(asking('/commands/options/', 'text/markdown;q=0, */*'), assets);

        expect(assets.asked).toEqual(['/guide/commands/options/']);
    });

    it('leaves a browser on the html page', async () => {
        const assets = recording('/guide/commands/options/');

        await send(asking('/commands/options/', 'text/html,application/xhtml+xml'), assets);

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

describe('the ask endpoint', () => {
    const SECTIONS = [
        { url: '/components/buttons', page: 'Buttons', text: 'buttons' },
        { url: '/checks/cooldown#the-duration', page: 'Cooldowns', heading: 'The duration', text: 'cooldowns' }
    ];
    const toward = (axis: number): number[] =>
        Array.from({ length: embedding.dimensions }, (_, index) => (index === axis ? 1 : 0));

    function searching({ allowed = true } = {}): Env & { embedded: string[] } {
        const embedded: string[] = [];
        const files: Record<string, () => Response> = {
            [`/guide${GUIDE_SECTIONS_PATH}`]: () => Response.json(SECTIONS),
            [`/guide${GUIDE_VECTORS_PATH}`]: () => new Response(new Float32Array([...toward(0), ...toward(1)]).buffer)
        };
        return {
            embedded,
            ASSETS: { fetch: (request) => Promise.resolve(files[new URL(request.url).pathname]?.() ?? new Response()) },
            AI: {
                run: (_, { text }) => {
                    embedded.push(...text);
                    return Promise.resolve({ data: [toward(1)] });
                }
            },
            ASK_LIMIT: { limit: () => Promise.resolve({ success: allowed }) }
        };
    }

    beforeEach(() => {
        const stored = new Map<string, Response>();
        vi.stubGlobal('caches', {
            open: () =>
                Promise.resolve({
                    match: (key: URL) => Promise.resolve(stored.get(key.toString())?.clone()),
                    put: (key: URL, response: Response) => Promise.resolve(void stored.set(key.toString(), response))
                })
        });
    });
    afterEach(() => vi.unstubAllGlobals());

    it('reads sections and titles from the paths their routes export to', () => {
        for (const path of [GUIDE_SECTIONS_PATH, GUIDE_TITLES_PATH]) {
            expect(existsSync(resolve(import.meta.dirname, `../src/app${path}/route.ts`)), path).toBe(true);
        }
    });

    it('answers with the closest sections and lets any site read them', async () => {
        const response = await get('/api/ask?q=how+long+is+a+cooldown', searching());

        expect(response.headers.get('access-control-allow-origin')).toBe('*');
        expect(await response.json()).toEqual([
            { path: '/checks/cooldown#the-duration', page: 'Cooldowns', heading: 'The duration' },
            { path: '/components/buttons', page: 'Buttons' }
        ]);
    });

    it('answers a repeated question from the cache without embedding it again', async () => {
        const env = searching();

        await get('/api/ask?q=make+a+button', env);
        await Promise.all(pending);
        const again = await get('/api/ask?q=+make+a+button+', env);

        expect(again.status).toBe(200);
        expect(env.embedded).toHaveLength(1);
    });

    it('refuses a question too short or too long without embedding it', async () => {
        const env = searching();

        expect((await get('/api/ask?q=+', env)).status).toBe(400);
        expect((await get('/api/ask?q=k', env)).status).toBe(400);
        expect((await get(`/api/ask?q=${'k'.repeat(QUESTION_LENGTH.max + 1)}`, env)).status).toBe(400);
        expect(env.embedded).toEqual([]);
    });

    it('refuses once the visitor runs out of searches', async () => {
        const env = searching({ allowed: false });

        expect((await get('/api/ask?q=button', env)).status).toBe(429);
        expect(env.embedded).toEqual([]);
    });
});
