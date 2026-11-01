import { render, screen, type RenderResult } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
        <SearchResultRow
            result={result}
            isActive={false}
            optionId="row"
            index={0}
            onSelect={() => {}}
            onActivate={() => {}}
        />
    );
}

function renderRow(result: GuideResult = RESULT): RenderResult {
    return render(row(result));
}

// jsdom has no CSS Custom Highlight API
function stubHighlights(): () => string[] {
    const highlights = new Map<string, Set<Range>>();
    vi.stubGlobal('CSS', { highlights });
    vi.stubGlobal('Highlight', Set);
    return () => [...(highlights.get('search-match') ?? [])].map(String);
}

afterEach(() => vi.unstubAllGlobals());

describe('SearchResultRow', () => {
    it('highlights only the phrase that matched in the excerpt', () => {
        const highlighted = stubHighlights();

        renderRow();

        expect(highlighted()).toEqual(['a sliding window']);
    });

    it('moves the highlight when the excerpt changes under the same phrase', () => {
        const highlighted = stubHighlights();
        const { rerender } = renderRow();

        rerender(row({ ...RESULT, excerpt: 'Pick a sliding window here.' }));

        expect(highlighted()).toEqual(['a sliding window']);
    });

    it('still renders in a browser without the highlight API', () => {
        vi.stubGlobal('CSS', {});

        renderRow();

        expect(screen.getByRole('option', { name: 'Several uses per window, Checks, Cooldowns' })).toBeInTheDocument();
    });

    it('labels a page row with its tab', () => {
        vi.stubGlobal('CSS', {});

        renderRow({ path: '/checks/cooldown/', tab: 'Checks', page: 'Cooldowns', url: '', by: 'meaning' });

        expect(screen.getByRole('option', { name: 'Cooldowns, Checks' })).toBeInTheDocument();
    });
});
