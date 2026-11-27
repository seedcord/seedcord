import { describe, expect, it } from 'vite-plus/test';

import { addViteClient, transformPage } from '#src/hmr/transformPage';

const CLIENT = '<script type="module" src="/@vite/client"></script>';
const HTML = { 'content-type': 'text/html; charset=utf-8' };

describe('transformPage with addViteClient', () => {
    it("adds vite's client after the page, and keeps a closing tag inside a script, the status and the headers", async () => {
        const html = '<html><head><script>const tag = "</head>";</script></head><body>page</body></html>';
        const page = new Response(html, { status: 201, headers: { ...HTML, 'x-from-plugin': 'yes' } });

        const finished = await transformPage(page, addViteClient);

        expect(await finished.text()).toBe(html + CLIENT);
        expect([finished.status, finished.headers.get('x-from-plugin')]).toEqual([201, 'yes']);
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
