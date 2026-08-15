import { describe, expect, it } from 'vitest';

import { decorateProseLinks } from '#lib/docs/comments/renderers/decorateProseLinks';

describe('decorateProseLinks', () => {
    it('leaves a same-package internal link untouched', () => {
        const html = '<p><a href="/packages/seedcord/latest/classes/Seedcord"><code>Seedcord</code></a></p>';
        expect(decorateProseLinks(html, 'seedcord')).toBe(html);
    });

    it('opens a cross-package internal link in a new tab with the cross-ref class', () => {
        const html = '<p><a href="/packages/utils/latest/functions/clamp"><code>clamp</code></a></p>';
        const out = decorateProseLinks(html, 'seedcord');
        expect(out).toContain('target="_blank"');
        expect(out).toContain('rel="noopener noreferrer"');
        expect(out).toContain('class="cross-ref"');
    });

    it('decorates external https links', () => {
        const html = '<p><a href="https://discord.js.org/docs">discord.js</a></p>';
        const out = decorateProseLinks(html, 'seedcord');
        expect(out).toContain('target="_blank"');
        expect(out).toContain('class="cross-ref"');
    });

    it('preserves the original href and inner markup', () => {
        const html = '<p><a href="/packages/utils/latest/functions/clamp"><code>clamp</code></a></p>';
        const out = decorateProseLinks(html, 'seedcord');
        expect(out).toContain('href="/packages/utils/latest/functions/clamp"');
        expect(out).toContain('<code>clamp</code></a>');
    });
});
