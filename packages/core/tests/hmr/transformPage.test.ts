import { describe, expect, it } from 'vite-plus/test';

import { addViteClient, transformPage } from '#src/hmr/transformPage';

const CLIENT = '<script type="module" src="/@vite/client"></script>';
const HTML = { 'content-type': 'text/html; charset=utf-8' };

describe('transformPage with addViteClient', () => {
    it("adds vite's client to the head and keeps the status and headers", async () => {
        const page = new Response('<html><head></head><body>page</body></html>', {
            status: 201,
            headers: { ...HTML, 'x-from-plugin': 'yes' }
        });

        const finished = await transformPage(page, addViteClient);

        expect(await finished.text()).toBe(`<html><head>${CLIENT}</head><body>page</body></html>`);
        expect([finished.status, finished.headers.get('x-from-plugin')]).toEqual([201, 'yes']);
    });

    it('adds the client at the end of a page without closing tags', async () => {
        // the html spec lets a page skip </head> and </body>. browsers still run a script at the end
        const bare = '<!doctype html><title>bare</title><p>page';

        const finished = await transformPage(new Response(bare, { headers: HTML }), addViteClient);

        expect(await finished.text()).toBe(bare + CLIENT);
    });

    it('leaves json, a 304 without a body, and a compressed page as they were', async () => {
        const [data, cached, gzip] = await Promise.all([
            transformPage(Response.json({ html: false }), addViteClient),
            transformPage(new Response(null, { status: 304, headers: HTML }), addViteClient),
            transformPage(
                new Response('compressed', { headers: { ...HTML, 'content-encoding': 'gzip' } }),
                addViteClient
            )
        ]);

        expect(await data.json()).toEqual({ html: false });
        expect(cached.status).toBe(304);
        expect(await gzip.text()).toBe('compressed');
    });
});
