import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render, screen, type RenderResult } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { SearchResultRow } from '#components/SearchResultRow';

import type { GuideResult } from '@seedcord/docs-search';
import type { ReactElement } from 'react';

const RESULT: GuideResult = {
    path: '/checks/cooldown/#several-uses-per-window',
    tab: 'Checks',
    page: 'Cooldowns',
    heading: 'Several uses per window',
    url: 'https://seedcord.org/guide/checks/cooldown/#several-uses-per-window',
    by: 'text',
    excerpt: '…one window with limit. The window is a sliding window, so each use counts after it happens.',
    terms: ['a sliding window']
};

function row(result: GuideResult): ReactElement {
    return (
        <SearchResultRow result={result} isActive={false} optionId="row" onSelect={() => {}} onActivate={() => {}} />
    );
}

function renderRow(result: GuideResult = RESULT): RenderResult {
    return render(row(result));
}

// jsdom doesn't implement the CSS Custom Highlight API
function stubHighlights(): Map<string, Set<Range>> {
    const highlights = new Map<string, Set<Range>>();
    vi.stubGlobal('CSS', { highlights });
    vi.stubGlobal('Highlight', Set);
    return highlights;
}

const highlightedText = (highlights: Map<string, Set<Range>>): string[] =>
    [...highlights.values()].flatMap((ranges) => [...ranges].map(String));

afterEach(() => vi.unstubAllGlobals());

describe('SearchResultRow', () => {
    it('highlights only the phrase that matched in the excerpt, under a name globals.css styles', () => {
        const highlights = stubHighlights();
        const css = readFileSync(resolve(import.meta.dirname, '../../src/app/globals.css'), 'utf8');

        renderRow();

        expect(highlightedText(highlights)).toEqual(['a sliding window']);
        for (const name of highlights.keys()) expect(css).toContain(`::highlight(${name})`);
    });

    it('moves the highlight when the excerpt changes under the same phrase', () => {
        const highlights = stubHighlights();
        const { rerender } = renderRow();

        rerender(row({ ...RESULT, excerpt: 'Pick a sliding window here.' }));

        expect(highlightedText(highlights)).toEqual(['a sliding window']);
    });

    it('still renders in a browser without the highlight API', () => {
        vi.stubGlobal('CSS', {});

        renderRow();

        expect(screen.getByRole('option', { name: 'Several uses per window, Checks, Cooldowns' })).toBeInTheDocument();
    });

    it('shows the opening text of a section found by meaning, with nothing highlighted', () => {
        const highlights = stubHighlights();

        renderRow({
            path: '/checks/cooldown/',
            tab: 'Checks',
            page: 'Cooldowns',
            url: '',
            by: 'meaning',
            excerpt: 'Stop someone spamming a command.'
        });

        expect(screen.getByText('Stop someone spamming a command.')).toBeInTheDocument();
        expect(highlightedText(highlights)).toEqual([]);
    });

    it('labels a page row with its tab', () => {
        vi.stubGlobal('CSS', {});

        renderRow({ path: '/checks/cooldown/', tab: 'Checks', page: 'Cooldowns', url: '', by: 'meaning' });

        expect(screen.getByRole('option', { name: 'Cooldowns, Checks' })).toBeInTheDocument();
    });
});
