import { describe, expect, it } from 'vitest';

import { serializeJsonLd } from '#src/structuredData';

describe('serializeJsonLd', () => {
    it('escapes < so a closing script tag in a value stays inside the JSON', () => {
        const json = serializeJsonLd({ headline: '</script><b>' });

        expect(json).not.toContain('<');
        expect(JSON.parse(json)).toEqual({ headline: '</script><b>' });
    });
});
