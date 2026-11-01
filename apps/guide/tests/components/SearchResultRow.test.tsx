import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchResultRow } from '#components/SearchResultRow';

import type { GuideResult } from '@seedcord/docs-search';

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

function renderRow(): void {
    render(
        <SearchResultRow
            result={RESULT}
            isActive={false}
            optionId="row"
            index={0}
            onSelect={() => {}}
            onActivate={() => {}}
        />
    );
}

afterEach(() => vi.unstubAllGlobals());

describe('SearchResultRow', () => {
    it('highlights only the phrase that matched in the excerpt', () => {
        // jsdom has no CSS Custom Highlight API
        const highlights = new Map<string, Set<Range>>();
        vi.stubGlobal('CSS', { highlights });
        vi.stubGlobal('Highlight', Set);

        renderRow();

        expect([...(highlights.get('search-match') ?? [])].map(String)).toEqual(['a sliding window']);
    });

    it('still renders in a browser without the highlight API', () => {
        vi.stubGlobal('CSS', {});

        renderRow();

        expect(screen.getByRole('option', { name: 'Several uses per window' })).toBeInTheDocument();
    });
});
