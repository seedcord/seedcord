import { describe, expect, it } from 'vitest';

import { escapeHtml } from '#src/escapeHtml';

describe('escapeHtml', () => {
    it('escapes all five characters in one pass', () => {
        expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    });

    it('escapes the & of an entity that is already in the text', () => {
        expect(escapeHtml('&lt;')).toBe('&amp;lt;');
    });
});
