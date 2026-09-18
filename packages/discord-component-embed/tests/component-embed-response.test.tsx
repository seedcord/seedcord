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

    it('counts bytes, so multi-byte text reaches the limit sooner', () => {
        // € is 3 bytes in UTF-8
        const content = '€'.repeat(1000);

        expect(OVERHEAD + content.length).toBeLessThan(3000);
        expectEmbedError(
            () => componentEmbedResponse(withText(content)),
            `Linked component embed JSON is limited to 3000 bytes, this one is ${String(OVERHEAD + 3000)}.`
        );
    });
});
