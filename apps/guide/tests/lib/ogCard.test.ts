import { describe, expect, it } from 'vitest';

import { tabPillFor } from '#lib/og/card';

describe('the pill on a guide card', () => {
    it('names the tab a page belongs to', () => {
        expect(tabPillFor('commands/options.mdx')).toBe('commands');
    });

    it('names the tab on the tab index itself', () => {
        expect(tabPillFor('commands/index.mdx')).toBe('commands');
    });

    // the Start tab's pages live directly under content/docs
    it('names Start for a page with no folder above it', () => {
        expect(tabPillFor('first-bot.mdx')).toBe('start');
    });

    it('names Start for the root page', () => {
        expect(tabPillFor('index.mdx')).toBe('start');
    });
});
