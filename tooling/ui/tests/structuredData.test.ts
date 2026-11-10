import { describe, expect, it } from 'vite-plus/test';

import { serializeJsonLd } from '#src/structuredData';

describe('serializeJsonLd', () => {
    it("escapes < so a closing script tag in a value can't end the script", () => {
        const json = serializeJsonLd({ headline: '</script><b>' });

        expect(json).not.toContain('<');
        expect(JSON.parse(json)).toEqual({ headline: '</script><b>' });
    });
});
