import { describe, expect, it } from 'vitest';

import { Container, TextDisplay, h, toComponentEmbed, toComponentEmbedJson } from '#src/index';

describe('toComponentEmbedJson', () => {
    it('returns the payload as a JSON string', () => {
        const card = h(Container, null, h(TextDisplay, null, '# Hello'));

        expect(JSON.parse(toComponentEmbedJson(card))).toEqual(toComponentEmbed(card));
    });

    it('escapes </ and <!-- so text in the card cannot close a script tag', () => {
        const content = '</script><!-- <script>alert(1)</script>';
        const json = toComponentEmbedJson(h(Container, null, h(TextDisplay, null, content)));

        expect(json).not.toContain('</');
        expect(json).not.toContain('<!--');
        expect(JSON.parse(json)).toEqual({ component: { type: 17, components: [{ type: 10, content }] } });
    });

    it('leaves every other < as it is', () => {
        const content = 'Built with <:seedcord:1538077321318236281> by <@123>';
        const json = toComponentEmbedJson(h(Container, null, h(TextDisplay, null, content)));

        expect(json).toContain(content);
    });
});
