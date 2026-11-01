import { describe, expect, it } from 'vitest';

import { pillFor } from '#lib/og/card';

describe('the pill on a guide card', () => {
    it('shows the tab a page belongs to', () => {
        expect(pillFor({ slugs: ['commands', 'options'], path: 'commands/options.mdx' })).toBe('commands');
    });

    it('shows the tab on the tab index itself', () => {
        expect(pillFor({ slugs: ['commands'], path: 'commands/index.mdx' })).toBe('commands');
    });

    // the Start tab's pages are directly under content/docs
    it('names Start for a page with no folder above it', () => {
        expect(pillFor({ slugs: ['first-bot'], path: 'first-bot.mdx' })).toBe('start');
    });

    it('shows the site name on the root page', () => {
        expect(pillFor({ slugs: [], path: 'index.mdx' })).toBe('guide');
    });
});
