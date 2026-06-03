import { describe, expect, it } from 'vitest';

import { escapeHtml } from '@lib/docs/comments/cleaners';

describe('escapeHtml', () => {
    it('escapes ampersand', () => {
        expect(escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('escapes less-than', () => {
        expect(escapeHtml('1 < 2')).toBe('1 &lt; 2');
    });

    it('escapes greater-than', () => {
        expect(escapeHtml('2 > 1')).toBe('2 &gt; 1');
    });

    it('escapes double quote', () => {
        expect(escapeHtml('say "hi"')).toBe('say &quot;hi&quot;');
    });

    it('escapes single quote', () => {
        expect(escapeHtml("it's")).toBe('it&#39;s');
    });

    it('neutralizes a <script> tag', () => {
        expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('escapes a mixed payload in a single pass', () => {
        expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    });

    it('escapes ampersand before other entities so output is not double-encoded on re-run', () => {
        // justified: ampersand must map to &amp; first; otherwise running twice turns &lt; into &amp;lt;.
        expect(escapeHtml(escapeHtml('<&>'))).toBe('&amp;lt;&amp;amp;&amp;gt;');
    });

    it('returns the input unchanged when no escapable characters are present', () => {
        expect(escapeHtml('plain text 123')).toBe('plain text 123');
    });

    it('handles the empty string', () => {
        expect(escapeHtml('')).toBe('');
    });
});
