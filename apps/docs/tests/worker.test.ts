import { describe, expect, it } from 'vitest';

import handler from '../worker';

type Env = Parameters<typeof handler.fetch>[1];

const DOCS = 'https://seedcord.org/docs';

const INDEX = {
    schemaVersion: 1,
    updatedAt: '2026-10-02T00:00:00.000Z',
    pathTemplates: { stable: '{name}/{version}', prerelease: '{name}/next/{version}' },
    packages: {
        core: {
            fullName: '@seedcord/core',
            stable: { latest: '0.9.2', latestByMinor: { '0.9': '0.9.2' }, latestByMajor: { '0': '0.9.2' } },
            prerelease: null
        }
    }
};

const BUILD_ID = '20261002T051234Z-ba35d6b';

// one build folder holding only the keys given, plus a copy of index.json
function bucket(...keys: string[]): Env {
    const folder = `builds/${BUILD_ID}/`;
    const files = new Map<string, string>([
        ...keys.map((key): [string, string] => [`${folder}${key}`, key]),
        [`${folder}index.json`, JSON.stringify(INDEX)]
    ]);
    return {
        BUILD_ID,
        DOCS: {
            get: (key: string) => {
                const body = files.get(key);
                return Promise.resolve(body === undefined ? null : { body, httpEtag: `"${key}"` });
            }
        }
    };
}

// the preview folder as wrangler's assets binding serves it
function exportFolder(...keys: string[]): Env {
    return {
        BUILD_ID,
        ASSETS: {
            fetch: (request: Request) => {
                const key = decodeURIComponent(new URL(request.url).pathname.slice(1));
                const found = keys.some((stored) => `builds/${BUILD_ID}/${stored}` === key);
                return Promise.resolve(new Response(found ? key : null, { status: found ? 200 : 404 }));
            }
        }
    };
}

function get(path: string, env: Env, host = DOCS): Promise<Response> {
    return handler.fetch(new Request(`${host}${path}`), env);
}

describe('the docs worker', () => {
    it('serves a page from its html file', async () => {
        const response = await get(
            '/packages/core/latest/classes/base-handler',
            bucket('packages/core/latest/classes/base-handler.html')
        );

        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
        await expect(response.text()).resolves.toBe('packages/core/latest/classes/base-handler.html');
    });

    it('reads a dotted version segment as a page', async () => {
        const env = bucket('packages/core/0.9.2.html');
        expect((await get('/packages/core/0.9.2', env)).status).toBe(200);
    });

    it('serves the docs root and its navigation payload', async () => {
        const env = bucket('index.html', 'index.txt');

        expect((await get('', env)).status).toBe(200);
        const payload = await get('.txt', env);
        expect(payload.status).toBe(200);
        expect(payload.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    });

    it('redirects a trailing slash to the path without one', async () => {
        const env = bucket();

        const page = await get('/packages/core/latest/', env);
        expect(page.status).toBe(308);
        expect(page.headers.get('location')).toBe('/docs/packages/core/latest');

        expect((await get('/', env)).headers.get('location')).toBe('/docs');
    });

    it('serves a twin and a card from the folders the export writes them to', async () => {
        const env = bucket('llms/packages/core/latest.md', 'og/packages/core/latest.png');

        const twin = await get('/packages/core/latest.md', env);
        expect(twin.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
        expect((await get('/packages/core/latest.png', env)).headers.get('content-type')).toBe('image/png');
    });

    it('serves the extensionless favicon as a png', async () => {
        const response = await get('/icon', bucket('icon'));
        expect(response.headers.get('content-type')).toBe('image/png');
    });

    it('points an agent at the markdown twin of a page', async () => {
        const response = await get('/packages/core/latest', bucket('packages/core/latest.html'));
        expect(response.headers.get('link')).toContain(
            '</docs/packages/core/latest.md>; rel="alternate"; type="text/markdown"'
        );
    });

    it('sends the site relations on a page outside the packages', async () => {
        const link = (await get('', bucket('index.html'))).headers.get('link') ?? '';

        expect(link).toContain('</docs/llms.txt>; rel="describedby"');
        expect(link).not.toContain('rel="alternate"');
    });

    it('caches hashed build files for a year and everything else briefly', async () => {
        const env = bucket('_next/static/chunks/app.js', 'index.html');

        expect((await get('/_next/static/chunks/app.js', env)).headers.get('cache-control')).toContain('immutable');
        expect((await get('', env)).headers.get('cache-control')).toBe('public, max-age=300');
    });

    it('keeps search indexes out of search engines', async () => {
        const response = await get('/search/core/0.9.2.json', bucket('search/core/0.9.2.json'));
        expect(response.headers.get('x-robots-tag')).toBe('noindex');
    });

    it('keeps every page off a host other than seedcord.org out of search engines', async () => {
        const response = await get('', bucket('index.html'), 'http://localhost:8787/docs');
        expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    });

    it('redirects a patch the index replaced to the head of its line', async () => {
        const response = await get('/packages/core/0.9.1/classes/base-handler?tab=members', bucket());

        expect(response.status).toBe(308);
        expect(response.headers.get('location')).toBe('/docs/packages/core/0.9.2/classes/base-handler?tab=members');
    });

    it('keeps the extension when it redirects a replaced overview twin', async () => {
        const response = await get('/packages/core/0.9.1.md', bucket());
        expect(response.headers.get('location')).toBe('/docs/packages/core/0.9.2.md');
    });

    it('answers a path that only starts with /docs with the 404 page', async () => {
        const response = await get('foo', bucket('index.html', 'foo.html', '404.html'));
        await expect(response.text()).resolves.toBe('404.html');
    });

    it('reads the build folder through an assets binding when no bucket is bound', async () => {
        const env = exportFolder(
            'packages/core/latest.html',
            'packages/core/latest/__next.$d$packageId.txt',
            '404.html'
        );

        expect((await get('/packages/core/latest', env)).status).toBe(200);
        expect((await get('/packages/core/latest/__next.$d$packageId.txt', env)).status).toBe(200);
        expect((await get('/packages/core/latest/classes/ghost', env)).status).toBe(404);
    });

    it('answers a missing page with the 404 page', async () => {
        const response = await get('/packages/core/latest/classes/ghost', bucket('404.html'));

        expect(response.status).toBe(404);
        await expect(response.text()).resolves.toBe('404.html');
    });
});
