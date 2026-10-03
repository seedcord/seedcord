import { describe, expect, it } from 'vitest';

import { checkTarget } from '#src/check';

import { card, HTML, page, TYPES, withPages, withSlowPages } from './helpers';

import type { CheckInput } from '#src/check';

describe("checkTarget reading a page's HTML", () => {
    const PAGE = 'https://example.com/post';
    const good = card({ type: 10, content: 'hi' });

    it('keeps the embed when other scripts on the page hold <!-- and -->', async () => {
        const html = page(
            `<script>var a = "<!--"</script><script id="discord:component-embed" type="application/json">${good}</script><script>var b = "-->"</script>`
        );

        expect(await checkTarget(PAGE, withPages({ [PAGE]: html }))).toMatchObject({ status: 'pass' });
    });

    it('adds the escapes toComponentEmbedScript writes when it works out the minified size of a script', async () => {
        const payload = { component: { type: 17, components: [{ type: 10, content: 'a</'.repeat(900) }] } };
        const sent = JSON.stringify(payload).replace('{', `{${' '.repeat(400)}`);
        expect(JSON.stringify(payload).length).toBeLessThan(3000);
        const html = page(`<script id="discord:component-embed" type="application/json">${sent}</script>`);

        const result = await checkTarget(PAGE, withPages({ [PAGE]: html }));

        expect(result).toMatchObject({ status: 'fail' });
        expect(result).not.toHaveProperty('hint');
    });

    it('reads the first of two attributes with the same name, like a browser', async () => {
        const html = page(
            `<script id="discord:component-embed" type="text/plain" type="application/json">${good}</script>`
        );

        expect(await checkTarget(PAGE, withPages({ [PAGE]: html }))).toEqual({
            status: 'fail',
            problems: [`The <script id="discord:component-embed"> has to have ${TYPES}, got "text/plain".`]
        });
    });

    it('skips a <link> written inside another script', async () => {
        const html = page(
            `<script>var tpl = '<link rel="discord:component-embed" type="application/json" href="https://example.com/post.json">';</script>`
        );

        expect(
            await checkTarget(PAGE, withPages({ [PAGE]: html, 'https://example.com/post.json': good }))
        ).toMatchObject({ status: 'fail', problems: [expect.stringMatching(/^The page has no component embed\./)] });
    });

    it('measures a script body that holds <!-- and --> as sent', async () => {
        const body = card({ type: 10, content: 'a <!-- b --> c' });
        const html = page(`<script id="discord:component-embed" type="application/json">${body}</script>`);

        expect(await checkTarget(PAGE, withPages({ [PAGE]: html }))).toMatchObject({
            status: 'pass',
            bytes: body.length
        });
    });

    // on discord's crawler a <link> with no type never had its JSON fetched
    it('fails a <link> with no type', async () => {
        const html = page(`<link rel="discord:component-embed" href="https://embeds.example.com/post.json">`);

        expect(
            await checkTarget(PAGE, withPages({ [PAGE]: html, 'https://embeds.example.com/post.json': good }))
        ).toEqual({
            status: 'fail',
            problems: [`The <link rel="discord:component-embed"> has to have ${TYPES}, got nothing.`]
        });
    });

    // discord shows the Open Graph card when the linked JSON answers 404
    it('fails a page whose linked JSON does not load', async () => {
        const html = page(
            `<link rel="discord:component-embed" type="application/json" href="https://embeds.example.com/post.json">`
        );

        expect(await checkTarget(PAGE, withPages({ [PAGE]: html }))).toEqual({
            status: 'fail',
            problems: ["Couldn't fetch https://embeds.example.com/post.json: the server answered 404."]
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
        const html = page(
            `<link rel="discord:component-embed" type="application/json" href="https://embeds.example.com/post.json">`
        );
        const input: CheckInput = {
            ...withPages({ 'https://embeds.example.com/post.json': good }),
            fetch: (url, init) => {
                if (url !== PAGE) return withPages({ 'https://embeds.example.com/post.json': good }).fetch(url, init);
                const redirected = new Response(html, { headers: HTML });
                Object.defineProperty(redirected, 'url', { value: 'https://elsewhere.net/post' });
                return Promise.resolve(redirected);
            }
        };

        expect(await checkTarget(PAGE, input)).toMatchObject({ status: 'pass' });
    });

    it('takes a <link> to any domain above the page host', async () => {
        const blog = 'https://blog.www.example.com/post';
        const html = page(
            `<link rel="discord:component-embed" type="application/json" href="https://example.com/post.json">`
        );

        const result = await checkTarget(blog, withPages({ [blog]: html, 'https://example.com/post.json': good }));

        expect(result.status).toBe('pass');
    });

    it('reads a URL with an uppercase scheme as a URL', async () => {
        const html = page(`<script id="discord:component-embed" type="application/json">${good}</script>`);

        expect(await checkTarget('HTTPS://example.com/post', withPages({ [PAGE]: html }))).toMatchObject({
            status: 'pass'
        });
    });

    it('says a <link> has no href', async () => {
        const html = page(`<link rel="discord:component-embed" type="application/json">`);

        expect(await checkTarget(PAGE, withPages({ [PAGE]: html }))).toEqual({
            status: 'fail',
            problems: [
                "The <link> href has to be an absolute http or https URL on the page's host, a subdomain of it, or a domain above it, got nothing."
            ]
        });
    });

    it('reports a fetch that timed out as no answer within 10 seconds', async () => {
        const input: CheckInput = {
            ...withPages({}),
            fetch: () => Promise.reject(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))
        };

        expect(await checkTarget(PAGE, input)).toEqual({
            status: 'unreadable',
            reason: `Couldn't fetch ${PAGE}: no answer before the 10 seconds ran out. Discord waits about 10 seconds in total for the page and its linked JSON, then shows no preview.`
        });
    });

    it('fetches on a clock that reads fractions of a millisecond, like performance.now()', async () => {
        const html = page(`<script id="discord:component-embed" type="application/json">${good}</script>`);
        let now = 0;

        const result = await checkTarget(PAGE, { ...withPages({ [PAGE]: html }), nowMs: () => (now += 0.3) });

        expect(result.status).toBe('pass');
    });

    it('warns about a page that took over 9 seconds', async () => {
        const html = page(`<script id="discord:component-embed" type="application/json">${good}</script>`);

        expect(await checkTarget(PAGE, withSlowPages({ [PAGE]: html }, { [PAGE]: 9400 }))).toMatchObject({
            status: 'pass',
            warnings: [
                'Fetching this embed took 9.4 seconds. Discord waits about 10 seconds in total for the page and its linked JSON, then shows no preview.'
            ]
        });
    });

    it('stays quiet about a page that took under 9 seconds', async () => {
        const html = page(`<script id="discord:component-embed" type="application/json">${good}</script>`);

        const result = await checkTarget(PAGE, withSlowPages({ [PAGE]: html }, { [PAGE]: 8900 }));

        expect(result).not.toHaveProperty('warnings');
    });

    // on discord's crawler, a 6 s page left its linked JSON 3.8 s before discord closed the request
    describe('with a linked JSON, counting both fetches against one 10 seconds', () => {
        const JSON_URL = 'https://example.com/post.json';
        const html = page(`<link rel="discord:component-embed" type="application/json" href="${JSON_URL}">`);
        const pages = { [PAGE]: html, [JSON_URL]: good };

        it('warns when the two together take over 9 seconds', async () => {
            const result = await checkTarget(PAGE, withSlowPages(pages, { [PAGE]: 6000, [JSON_URL]: 3500 }));

            expect(result).toMatchObject({
                status: 'pass',
                warnings: [expect.stringMatching(/^Fetching this embed took 9\.5 seconds\./)]
            });
        });

        it('fails without fetching the JSON once the page used up the 10 seconds', async () => {
            const fetched: string[] = [];

            const result = await checkTarget(PAGE, withSlowPages(pages, { [PAGE]: 10_000 }, fetched));

            expect(result).toEqual({
                status: 'fail',
                problems: [
                    `Couldn't fetch ${JSON_URL}: no answer before the 10 seconds ran out. Discord waits about 10 seconds in total for the page and its linked JSON, then shows no preview.`
                ]
            });
            expect(fetched).toEqual([PAGE]);
        });
    });

    it("says when it can't fetch the page", async () => {
        expect(await checkTarget(PAGE, withPages({}))).toEqual({
            status: 'unreadable',
            reason: `Couldn't fetch ${PAGE}: the server answered 404.`
        });
    });
});
