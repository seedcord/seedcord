import { describe, expect, it } from 'vitest';

import { pageActionsFor } from '#lib/pageActions';

const page = {
    url: '/commands/options',
    path: 'commands/options.mdx',
    data: { title: 'Options' }
};

const MARKDOWN_URL = 'https://guide.seedcord.org/commands/options.md';

describe('pageActionsFor', () => {
    it('copies from the exported file and links the url a reader sees', () => {
        const actions = pageActionsFor(page);

        expect(actions.copySource).toBe('/llms/commands/options.md');
        expect(actions.viewHref).toBe('/commands/options.md');
    });

    it('hands each assistant the markdown url to read', () => {
        const { links } = pageActionsFor(page);
        const prompt = `Read ${MARKDOWN_URL}. I want to ask questions about it.`;

        expect(new URL(links.chatgpt).searchParams.get('prompt')).toBe(prompt);
        expect(new URL(links.claude).searchParams.get('q')).toBe(prompt);
        expect(new URL(links.cursor).searchParams.get('text')).toBe(prompt);
    });

    it('sends each assistant to its own host', () => {
        const { links } = pageActionsFor(page);

        expect(new URL(links.chatgpt).host).toBe('chatgpt.com');
        expect(new URL(links.claude).host).toBe('claude.ai');
        expect(new URL(links.cursor).host).toBe('cursor.com');
    });

    it('opens the page source on the branch pull requests land on', () => {
        expect(pageActionsFor(page).links.edit).toBe(
            'https://github.com/seedcord/seedcord/edit/next/apps/guide/content/docs/commands/options.mdx'
        );
    });

    it('fills an issue with the page it came from', () => {
        const report = new URL(pageActionsFor(page).links.report);

        expect(report.pathname).toBe('/seedcord/seedcord/issues/new');
        expect(report.searchParams.get('title')).toContain('Options');
        expect(report.searchParams.get('body')).toContain(MARKDOWN_URL);
    });
});
