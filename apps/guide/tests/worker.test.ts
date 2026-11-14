import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { NEXT_GUIDE } from '@seedcord/brand';
import { embedding, GUIDE_SECTIONS_PATH, GUIDE_VECTORS_PATH, QUESTION_RULE } from '@seedcord/docs-search';
import { GUIDE as guideSite } from '@seedcord/ui/sites';
import { parse } from 'jsonc-parser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { GuideAnswers } from '#lib/GuideAnswers';

// eslint-disable-next-line no-restricted-imports -- the app root has no alias
import handler from '../worker';

import type { Unstable_RawConfig } from 'wrangler';

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
        const next = await send(new Request('https://next.seedcord.org/guide/'), serving(html()));
        const production = await get('/', serving(html()));

        expect(next.headers.get('x-robots-tag')).toBe('noindex, nofollow');
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

    it("doesn't set the Link header on an asset that is not a page", async () => {
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

    // a screenshot added to public/ keeps its own url
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
    it("doesn't set Vary on an asset that never negotiates", async () => {
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

    it('serves a file with a $ in its name straight away', async () => {
        const encoded = '/guide/__next.%24oc%24slug.txt';
        const assets = recording(encoded);
        const served = assets.ASSETS.fetch;
        assets.ASSETS.fetch = (request) =>
            new URL(request.url).pathname === encoded
                ? served(request)
                : Promise.resolve(new Response(null, { status: 307, headers: { location: encoded } }));

        const response = await get('/__next.$oc$slug.txt', assets);

        expect(response.status).toBe(200);
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
        { path: '/components/buttons', tab: 'Components', page: 'Buttons', text: 'buttons' },
        {
            path: '/checks/cooldown#the-duration',
            tab: 'Checks',
            page: 'Cooldowns',
            heading: 'The duration',
            text: 'cooldowns'
        }
    ];
    const toward = (axis: number): number[] =>
        Array.from({ length: embedding.dimensions }, (_, index) => (index === axis ? 1 : 0));

    function searching({ allowed = true, aiError }: { allowed?: boolean; aiError?: Error } = {}): Env & {
        embedded: string[];
    } {
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
                    if (aiError) return Promise.reject(aiError);
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

    it('reads sections from the path its route exports to', () => {
        expect(existsSync(resolve(import.meta.dirname, `../src/app${GUIDE_SECTIONS_PATH}/route.ts`))).toBe(true);
    });

    it('answers with the closest sections and lets any site read them', async () => {
        const response = await get('/api/ask?q=how+long+is+a+cooldown', searching());

        expect(response.headers.get('access-control-allow-origin')).toBe('*');
        expect(await response.json()).toEqual([
            { path: '/checks/cooldown#the-duration', tab: 'Checks', page: 'Cooldowns', heading: 'The duration' }
        ]);
    });

    it('embeds the name of a certain error code and leaves a number that only might be one', async () => {
        const env = searching();

        await get('/api/ask?q=%5B3116%5D', env);
        await new GuideAnswers(env).ask('port 3102 is busy');

        expect(env.embedded).toEqual([embedding.query('CliDependencyMissing'), embedding.query('port 3102 is busy')]);
    });

    it('answers a repeated question from the cache without embedding it again', async () => {
        const env = searching();

        await get('/api/ask?q=make+a+button', env);
        await Promise.all(pending.splice(0));
        const again = await get('/api/ask?q=+make+a+button+', env);

        expect(again.status).toBe(200);
        expect(env.embedded).toHaveLength(1);
    });

    it('refuses a question parseQuestion rejects without embedding it', async () => {
        const env = searching();

        expect((await get('/api/ask?q=k', env)).status).toBe(400);
        expect(env.embedded).toEqual([]);
    });

    it('says to come back at midnight UTC once Workers AI runs out for the day', async () => {
        vi.useFakeTimers({ now: new Date('2026-11-01T17:00:00Z'), toFake: ['Date'] });
        const usedUp = new Error('4006: you have used up your daily free allocation of 10,000 neurons');

        const response = await get('/api/ask?q=button', searching({ aiError: usedUp }));
        vi.useRealTimers();

        expect(response.status).toBe(503);
        expect(response.headers.get('retry-after')).toBe(String(7 * 60 * 60));
        expect(response.headers.get('access-control-allow-origin')).toBe('*');
        expect(await response.json()).toEqual({ error: 'The guide search hit its daily limit. Try again in 7 hours.' });
    });

    it('answers another worker with results it can link to', async () => {
        const env = searching();

        await expect(new GuideAnswers(env).ask(' how long is  a cooldown ')).resolves.toEqual({
            hits: [
                {
                    path: '/checks/cooldown#the-duration',
                    tab: 'Checks',
                    page: 'Cooldowns',
                    heading: 'The duration',
                    url: guideSite.at('/checks/cooldown#the-duration'),
                    by: 'meaning'
                }
            ]
        });
        await expect(new GuideAnswers(env).ask('k')).rejects.toThrow(QUESTION_RULE);
        expect(env.embedded).toHaveLength(1);
    });

    it('tells another worker when the daily allowance resets', async () => {
        vi.useFakeTimers({ now: new Date('2026-11-01T17:00:00Z'), toFake: ['Date'] });
        const usedUp = new Error('4006: you have used up your daily free allocation of 10,000 neurons');

        const refused = await new GuideAnswers(searching({ aiError: usedUp })).ask('button');
        vi.useRealTimers();

        expect(refused).toEqual({ retryAfterSeconds: 7 * 60 * 60 });
    });

    it('refuses once the visitor runs out of searches', async () => {
        const env = searching({ allowed: false });

        const response = await get('/api/ask?q=button', env);

        expect(response.status).toBe(429);
        expect(env.embedded).toEqual([]);

        const config = wranglerConfig();
        const periods = [config, config.env?.next].map(
            (environment) => environment?.ratelimits?.find(({ name }) => name === 'ASK_LIMIT')?.simple.period
        );
        const retryAfter = Number(response.headers.get('retry-after'));
        expect(periods).toEqual([retryAfter, retryAfter]);
    });

    it('serves the next environment from the address the CLI searches', () => {
        expect(wranglerConfig().env?.next?.routes).toContainEqual({
            pattern: NEXT_GUIDE.label,
            zone_name: 'seedcord.org'
        });
    });
});

// wrangler validates this file on every deploy
function wranglerConfig(): Unstable_RawConfig {
    return parse(readFileSync(resolve(import.meta.dirname, '../wrangler.jsonc'), 'utf8')) as Unstable_RawConfig;
}
