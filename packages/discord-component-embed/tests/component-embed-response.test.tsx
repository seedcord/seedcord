import { describe, expect, it } from 'vitest';

import { componentEmbedResponse } from '#src/index';

import { expectEmbedError, withText } from './helpers';

// bytes the payload takes around the text content
const OVERHEAD = JSON.stringify({ component: { type: 17, components: [{ type: 10, content: '' }] } }).length;

describe('componentEmbedResponse', () => {
    it('answers with the payload as JSON', async () => {
        const response = componentEmbedResponse(withText('# Hello'));

        expect(response.headers.get('content-type')).toBe('application/json');
        expect(await response.json()).toEqual({
            component: { type: 17, components: [{ type: 10, content: '# Hello' }] }
        });
    });

    it('allows exactly 3000 bytes', () => {
        expect(() => componentEmbedResponse(withText('a'.repeat(3000 - OVERHEAD)))).not.toThrow();
    });

    it('sends custom emoji as written and adds one byte for the </', async () => {
        const content = `${'<:seedcord:1538077321318236281> '.repeat(80)}</script>`;

        const body = await componentEmbedResponse(withText(content)).text();

        expect(body).toHaveLength(OVERHEAD + content.length + 1);
        expect(JSON.parse(body)).toEqual({ component: { type: 17, components: [{ type: 10, content }] } });
    });

    it('counts bytes, so multi-byte text reaches the limit sooner', () => {
        // € is 3 bytes in UTF-8
        const content = '€'.repeat(1000);

        expect(OVERHEAD + content.length).toBeLessThan(3000);
        expectEmbedError(
            () => componentEmbedResponse(withText(content)),
            `This component embed's JSON is ${String(OVERHEAD + 3000)} bytes, over Discord's limit of 3000.`
        );
    });
});
