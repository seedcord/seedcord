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

    it('sends the JSON as it is, with no escaping for a script tag', async () => {
        const content = '<:seedcord:1538077321318236281> </script> <!-- a comment -->';

        const body = await componentEmbedResponse(withText(content)).text();

        expect(body).toBe(JSON.stringify({ component: { type: 17, components: [{ type: 10, content }] } }));
    });

    it('measures the 3000 bytes on the JSON it sends', () => {
        // 2065 bytes. escaped for a script tag it would be 3065
        const content = '</'.repeat(1000);

        expect(() => componentEmbedResponse(withText(content))).not.toThrow();
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
