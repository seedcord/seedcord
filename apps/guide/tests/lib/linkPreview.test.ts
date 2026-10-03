import { describe, expect, it } from 'vitest';

import { guidePreview } from '#lib/linkPreview';

const ORDER = [
    { label: 'Start here', href: '/', tab: 'Start' },
    { label: 'Replying', href: '/replying/', tab: 'Replying' },
    { label: 'Deferring', href: '/replying/deferring/', tab: 'Replying', group: 'Sending' },
    { label: 'Custom IDs', href: '/components/custom-ids/', tab: 'Components', group: 'Custom IDs' }
];

function page(url: string, title: string) {
    return { url, path: `${url.replace(/^\/|\/$/g, '') || 'index'}.mdx`, data: { title, description: 'A page.' } };
}

const words = (count: number): string => Array.from({ length: count }, () => 'word').join(' ');

describe('guidePreview', () => {
    it('shows the tab and group, and the page position in its tab', () => {
        const card = guidePreview({ page: page('/replying/deferring/', 'Deferring'), order: ORDER, twinMarkdown: '' });

        expect(card.breadcrumb).toEqual(['guide', 'Replying', 'Sending']);
        expect(card.subtext?.[0]).toBe('2 of 2 in Replying');
    });

    it('leaves out a group that repeats the page title', () => {
        const card = guidePreview({
            page: page('/components/custom-ids/', 'Custom IDs'),
            order: ORDER,
            twinMarkdown: ''
        });

        expect(card.breadcrumb).toEqual(['guide', 'Components']);
    });

    it('titles the front page with the site name', () => {
        expect(guidePreview({ page: page('/', 'Start here'), order: ORDER, twinMarkdown: '' }).title).toBe(
            'seedcord guide'
        );
    });

    it('reads prose at 200 words a minute and code at 400', () => {
        const twinMarkdown = `${words(400)}\n\n\`\`\`ts\n${words(400)}\n\`\`\``;
        const card = guidePreview({ page: page('/replying/', 'Replying'), order: ORDER, twinMarkdown });

        expect(card.subtext?.at(-1)).toBe('3 min read');
    });

    it('rounds a short page up to one minute', () => {
        const card = guidePreview({ page: page('/replying/', 'Replying'), order: ORDER, twinMarkdown: 'Hi.' });

        expect(card.subtext?.at(-1)).toBe('1 min read');
    });
});
