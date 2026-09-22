import { describe, expect, it } from 'vitest';

import { checkTarget } from '#src/check';

import type { CheckInput } from '#src/check';

const IMAGE = 'https://example.com/a.png';

function withFiles(files: Record<string, string>): CheckInput {
    return {
        readFile: (path) => {
            const text = files[path];
            if (text === undefined) return Promise.reject(new Error(`ENOENT: no such file, open '${path}'`));
            return Promise.resolve(text);
        },
        fetch: () => Promise.reject(new Error('no network in this test')),
        now: () => 0
    };
}

const card = (...components: unknown[]): string => JSON.stringify({ component: { type: 17, components } });

// discord's crawler is the boundary here. the fake answers each url with a fixed body
function withPages(pages: Record<string, string>, userAgents: string[] = []): CheckInput {
    return {
        readFile: () => Promise.reject(new Error('no files in this test')),
        fetch: (url, init) => {
            userAgents.push(new Headers(init.headers).get('user-agent') ?? '');
            const body = pages[url];
            return Promise.resolve(body === undefined ? new Response('', { status: 404 }) : new Response(body));
        },
        now: () => 0
    };
}

// each call returns the next time, in ms
function clock(...times: number[]): () => number {
    return () => times.shift() ?? 0;
}

const page = (head: string): string => `<!doctype html><html><head>${head}</head><body>hi</body></html>`;

describe('checkTarget on a file', () => {
    it('passes a valid card and reports its size', async () => {
        const text = card(
            { type: 10, content: 'hi' },
            { type: 12, items: [{ media: { url: IMAGE } }, { media: { url: IMAGE } }] }
        );

        expect(await checkTarget('embed.json', withFiles({ 'embed.json': text }))).toEqual({
            status: 'pass',
            bytes: text.length,
            components: 3,
            galleryItems: 2
        });
    });

    it('lists every problem in the file', async () => {
        const text = card({ type: 10, content: '' }, { type: 14, spacing: 3 }, { type: 3 });

        const result = await checkTarget('embed.json', withFiles({ 'embed.json': text }));

        expect(result).toEqual({
            status: 'fail',
            problems: [
                'A separator spacing has to be 1 (small) or 2 (large), got 3.\nFound at component > components > 1',
                "Type 3 can't go in a component embed. It takes types 1, 2, 9, 10, 11, 12, 14, and 17.\nFound at component > components > 2"
            ]
        });
    });

    it('measures the file as written and says how much whitespace costs', async () => {
        const payload = { component: { type: 17, components: [{ type: 10, content: 'x'.repeat(2900) }] } };
        const text = JSON.stringify(payload, null, 10);
        const minified = JSON.stringify(payload).length;
        expect(text.length).toBeGreaterThan(3000);
        expect(minified).toBeLessThan(3000);

        const result = await checkTarget('embed.json', withFiles({ 'embed.json': text }));

        expect(result).toEqual({
            status: 'fail',
            problems: [
                `This component embed's JSON is ${String(text.length)} bytes, over Discord's limit of 3000. Shorten its text or its URLs.`
            ],
            hint: `Minified, the JSON is ${String(minified)} bytes.`
        });
    });

    it("leaves out the minified size when minifying wouldn't get the file under the limit", async () => {
        const payload = { component: { type: 17, components: [{ type: 10, content: 'x'.repeat(3500) }] } };

        const result = await checkTarget('embed.json', withFiles({ 'embed.json': JSON.stringify(payload, null, 1) }));

        expect(result).toMatchObject({ status: 'fail' });
        expect(result).not.toHaveProperty('hint');
    });

    it('measures text full of </ as sent, before any script escaping', async () => {
        const text = card({ type: 10, content: '</'.repeat(1400) });

        expect(await checkTarget('embed.json', withFiles({ 'embed.json': text }))).toEqual({
            status: 'pass',
            bytes: text.length,
            components: 2,
            galleryItems: 0
        });
    });

    it('reports the size of an oversized file next to its other problems', async () => {
        const payload = { component: { type: 17, components: [{ type: 10, content: 'x'.repeat(2800) }, { type: 3 }] } };
        const text = JSON.stringify(payload, null, 40);

        const result = await checkTarget('embed.json', withFiles({ 'embed.json': text }));

        expect(result).toEqual({
            status: 'fail',
            problems: [
                `This component embed's JSON is ${String(text.length)} bytes, over Discord's limit of 3000. Shorten its text or its URLs.`,
                "Type 3 can't go in a component embed. It takes types 1, 2, 9, 10, 11, 12, 14, and 17.\nFound at component > components > 1"
            ],
            hint: `Minified, the JSON is ${String(JSON.stringify(payload).length)} bytes.`
        });
    });

    it('reports one problem for each broken component the tree checks catch', async () => {
        const text = card(
            { type: 10, content: '' },
            {
                type: 9,
                components: [{ type: 10, content: 'fine' }],
                accessory: { type: 11, media: { url: 'ftp://a.png' } }
            },
            { type: 12, items: [{ media: { url: IMAGE } }, { media: { url: IMAGE }, description: 'd'.repeat(1025) }] },
            {
                type: 1,
                components: [
                    { type: 2, style: 5, url: IMAGE, label: 'fine' },
                    { type: 2, style: 5, url: IMAGE, label: 'x'.repeat(81) }
                ]
            }
        );

        const result = await checkTarget('embed.json', withFiles({ 'embed.json': text }));

        expect(result.status === 'fail' && result.problems.map((problem) => problem.split('\nFound at ')[1])).toEqual([
            'Container > TextDisplay',
            'Container > Section > Thumbnail',
            'Container > MediaGallery > MediaGalleryItem 2',
            'Container > ActionRow > LinkButton 2'
        ]);
    });

    it('reports every limit the whole embed breaks', async () => {
        const texts = Array.from({ length: 40 }, () => ({ type: 10, content: 'line' }));
        const gallery = { type: 12, items: Array.from({ length: 6 }, () => ({ media: { url: IMAGE } })) };

        const result = await checkTarget('embed.json', withFiles({ 'embed.json': card(...texts, gallery, gallery) }));

        expect(result.status === 'fail' && result.problems.map((problem) => problem.split('.')[0])).toEqual([
            'This component embed has 43 components',
            'The galleries in this component embed hold 12 items (6 + 6)'
        ]);
    });

    it("keeps a parse error that quotes the file's last line on one line", async () => {
        const result = await checkTarget('embed.json', withFiles({ 'embed.json': '{ "component": ] }\n' }));

        expect(result).toMatchObject({ status: 'fail', problems: [expect.not.stringContaining('\n')] });
    });

    it("fails a file that isn't JSON", async () => {
        const result = await checkTarget('embed.json', withFiles({ 'embed.json': '{ "component": ' }));

        expect(result.status).toBe('fail');
        expect(result.status === 'fail' && result.problems[0]).toMatch(/^The JSON doesn't parse: /);
    });

    it("says when it can't read the file", async () => {
        expect(await checkTarget('missing.json', withFiles({}))).toEqual({
            status: 'unreadable',
            reason: "Couldn't read missing.json: ENOENT: no such file, open 'missing.json'"
        });
    });
});

describe('checkTarget on a url', () => {
    const PAGE = 'https://example.com/post';
    const good = card({ type: 10, content: 'hi' });

    it('checks the inline script as the page serves it, with a Discordbot user agent', async () => {
        const userAgents: string[] = [];
        const html = page(
            `<meta charset="utf-8"><script type="application/json" id="discord:component-embed">${good}</script>`
        );

        expect(await checkTarget(PAGE, withPages({ [PAGE]: html }, userAgents))).toEqual({
            status: 'pass',
            bytes: good.length,
            components: 2,
            galleryItems: 0
        });
        expect(userAgents).toEqual([expect.stringContaining('Discordbot')]);
    });

    it('follows a <link> to its JSON, which discord fetches with a shorter user agent', async () => {
        const userAgents: string[] = [];
        const html = page(
            `<link type="application/json" rel="discord:component-embed" href="https://embeds.example.com/post.json">`
        );
        const pages = { [PAGE]: html, 'https://embeds.example.com/post.json': card({ type: 10, content: '' }) };

        const result = await checkTarget(PAGE, withPages(pages, userAgents));

        expect(result).toEqual({
            status: 'fail',
            problems: ['A <TextDisplay> is empty. Give it some text or remove it.\nFound at Container > TextDisplay']
        });
        expect(userAgents).toEqual([expect.stringContaining('Mozilla/5.0'), 'Discordbot/2.0']);
    });

    it.each([
        ['no type', '', 'nothing'],
        ['another type', ' type="text/json"', '"text/json"']
    ])('fails an inline script with %s the way discord does', async (_label, typeAttribute, got) => {
        const html = page(`<script id="discord:component-embed"${typeAttribute}>${good}</script>`);

        expect(await checkTarget(PAGE, withPages({ [PAGE]: html }))).toEqual({
            status: 'fail',
            problems: [`The <script id="discord:component-embed"> has to have type="application/json", got ${got}.`]
        });
    });

    it('checks a URL that serves JSON as that JSON', async () => {
        const input: CheckInput = {
            ...withPages({}),
            fetch: () =>
                Promise.resolve(new Response(good, { headers: { 'content-type': 'application/json; charset=utf-8' } }))
        };

        expect(await checkTarget('https://example.com/post.json', input)).toMatchObject({
            status: 'pass',
            bytes: good.length
        });
    });

    it("says a target that isn't a valid URL can't be read", async () => {
        expect(await checkTarget('http://', withPages({}))).toEqual({
            status: 'unreadable',
            reason: "http:// isn't a valid URL."
        });
    });

    it('reads a character reference past the last code point as the replacement character, like a browser', async () => {
        const html = page(`<link rel="discord:component-embed" href="https://example.com/post.json?x=&#99999999;">`);

        const result = await checkTarget(
            PAGE,
            withPages({ [PAGE]: html, 'https://example.com/post.json?x=%EF%BF%BD': good })
        );

        expect(result.status).toBe('pass');
    });

    it('reads an href the way a browser does, with its character references decoded', async () => {
        const html = page(
            `<link rel="discord:component-embed" href="https://embeds.example.com/post.json?a=1&amp;b=&#50;">`
        );

        const result = await checkTarget(
            PAGE,
            withPages({ [PAGE]: html, 'https://embeds.example.com/post.json?a=1&b=2': good })
        );

        expect(result.status).toBe('pass');
    });

    it.each([
        ['an http href', 'http://example.com/post.json'],
        ['a relative href', '/post.json'],
        ['an href on another site', 'https://elsewhere.com/post.json']
    ])('fails %s the way discord does', async (_label, href) => {
        const html = page(`<link rel="discord:component-embed" href="${href}">`);

        expect(await checkTarget(PAGE, withPages({ [PAGE]: html }))).toEqual({
            status: 'fail',
            problems: [
                `The <link> href has to be an absolute https URL on the page's host, a subdomain of it, or its parent domain, got ${href}.`
            ]
        });
    });

    it('fails a page with no component embed', async () => {
        expect(await checkTarget(PAGE, withPages({ [PAGE]: page('<title>hi</title>') }))).toEqual({
            status: 'fail',
            problems: [
                'The page has no component embed. Discord reads a <script id="discord:component-embed"> or a <link rel="discord:component-embed">.'
            ]
        });
    });

    it("gives the network error behind node's fetch failed", async () => {
        const input: CheckInput = {
            ...withPages({}),
            fetch: () =>
                Promise.reject(new TypeError('fetch failed', { cause: new Error('getaddrinfo ENOTFOUND example.com') }))
        };

        expect(await checkTarget(PAGE, input)).toEqual({
            status: 'unreadable',
            reason: `Couldn't fetch ${PAGE}: getaddrinfo ENOTFOUND example.com`
        });
    });

    it('keeps a multi-line network error on one line', async () => {
        const input: CheckInput = {
            ...withPages({}),
            fetch: () => Promise.reject(new Error('ssl routines:wrong version number:\n'))
        };

        expect(await checkTarget(PAGE, input)).toEqual({
            status: 'unreadable',
            reason: `Couldn't fetch ${PAGE}: ssl routines:wrong version number:`
        });
    });

    it('skips an embed inside an HTML comment', async () => {
        const commented = `<!-- <script id="discord:component-embed" type="application/json">${card({ type: 3 })}</script> -->`;
        const html = page(`${commented}<script id="discord:component-embed" type="application/json">${good}</script>`);

        expect(await checkTarget(PAGE, withPages({ [PAGE]: html }))).toMatchObject({ status: 'pass' });
    });

    it('reads a tag whose attribute value holds a >', async () => {
        const html = page(
            `<script data-note="a>b" id="discord:component-embed" type="application/json">${good}</script>`
        );

        expect(await checkTarget(PAGE, withPages({ [PAGE]: html }))).toMatchObject({ status: 'pass' });
    });

    // on discord's crawler, a page that redirected to another host still had its <link> held to the pasted host
    it('holds a <link> to the host you passed in, even when the page came back from another host', async () => {
        const html = page(`<link rel="discord:component-embed" href="https://embeds.example.com/post.json">`);
        const input: CheckInput = {
            ...withPages({ 'https://embeds.example.com/post.json': good }),
            fetch: (url, init) => {
                if (url !== PAGE) return withPages({ 'https://embeds.example.com/post.json': good }).fetch(url, init);
                const redirected = new Response(html);
                Object.defineProperty(redirected, 'url', { value: 'https://elsewhere.net/post' });
                return Promise.resolve(redirected);
            }
        };

        expect(await checkTarget(PAGE, input)).toMatchObject({ status: 'pass' });
    });

    it('reads a URL with an uppercase scheme as a URL', async () => {
        const html = page(`<script id="discord:component-embed" type="application/json">${good}</script>`);

        expect(await checkTarget('HTTPS://example.com/post', withPages({ [PAGE]: html }))).toMatchObject({
            status: 'pass'
        });
    });

    it('says a <link> has no href', async () => {
        const html = page(`<link rel="discord:component-embed">`);

        expect(await checkTarget(PAGE, withPages({ [PAGE]: html }))).toEqual({
            status: 'fail',
            problems: [
                "The <link> href has to be an absolute https URL on the page's host, a subdomain of it, or its parent domain, got nothing."
            ]
        });
    });

    it('gives up on a page after 10 seconds, the way discord does', async () => {
        const signals: unknown[] = [];
        const input: CheckInput = {
            ...withPages({}),
            fetch: (_url, init) => {
                signals.push(init.signal);
                return Promise.reject(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
            }
        };

        expect(await checkTarget(PAGE, input)).toEqual({
            status: 'unreadable',
            reason: `Couldn't fetch ${PAGE}: no answer within 10 seconds. Discord shows no preview for a page that slow.`
        });
        expect(signals).toEqual([expect.any(AbortSignal)]);
    });

    it('warns about a page that took over 9 seconds', async () => {
        const html = page(`<script id="discord:component-embed" type="application/json">${good}</script>`);

        expect(await checkTarget(PAGE, { ...withPages({ [PAGE]: html }), now: clock(0, 9400) })).toMatchObject({
            status: 'pass',
            warnings: [
                `${PAGE} took 9.4 seconds to answer. Discord gives up after about 10 seconds and shows no preview.`
            ]
        });
    });

    it('stays quiet about a page that took under 9 seconds', async () => {
        const html = page(`<script id="discord:component-embed" type="application/json">${good}</script>`);

        const result = await checkTarget(PAGE, { ...withPages({ [PAGE]: html }), now: clock(0, 8900) });

        expect(result).not.toHaveProperty('warnings');
    });

    it("says when it can't fetch the page", async () => {
        expect(await checkTarget(PAGE, withPages({}))).toEqual({
            status: 'unreadable',
            reason: `Couldn't fetch ${PAGE}: the server answered 404.`
        });
    });
});

describe('checkTarget on an html file', () => {
    const good = card({ type: 10, content: 'hi' });
    const withFilesAndPages = (files: Record<string, string>, pages: Record<string, string> = {}): CheckInput => ({
        ...withFiles(files),
        fetch: (url, init) => withPages(pages).fetch(url, init)
    });

    it('checks the inline script as the build wrote it', async () => {
        const html = page(`<script type="application/json" id="discord:component-embed">${good}</script>`);

        expect(await checkTarget('dist/post.html', withFilesAndPages({ 'dist/post.html': html }))).toEqual({
            status: 'pass',
            bytes: good.length,
            components: 2,
            galleryItems: 0
        });
    });

    it('follows a <link> to its JSON', async () => {
        const html = page(`<link rel="discord:component-embed" href="https://example.com/post.json">`);
        const input = withFilesAndPages(
            { 'dist/post.html': html },
            { 'https://example.com/post.json': card({ type: 10, content: '' }) }
        );

        expect(await checkTarget('dist/post.html', input)).toEqual({
            status: 'fail',
            problems: ['A <TextDisplay> is empty. Give it some text or remove it.\nFound at Container > TextDisplay']
        });
    });

    it('fails a relative <link> href, since the file has no host to resolve it against', async () => {
        const html = page(`<link rel="discord:component-embed" href="/post.json">`);

        expect(await checkTarget('dist/post.html', withFilesAndPages({ 'dist/post.html': html }))).toEqual({
            status: 'fail',
            problems: ['The <link> href has to be an absolute https URL, got /post.json.']
        });
    });

    it('fails an .htm file with no component embed', async () => {
        expect(await checkTarget('post.htm', withFilesAndPages({ 'post.htm': page('<title>hi</title>') }))).toEqual({
            status: 'fail',
            problems: [
                'The page has no component embed. Discord reads a <script id="discord:component-embed"> or a <link rel="discord:component-embed">.'
            ]
        });
    });
});
