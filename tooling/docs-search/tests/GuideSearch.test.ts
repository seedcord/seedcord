import { createSearchAPI } from 'fumadocs-core/search/server';
import { afterEach, expect, it, vi } from 'vitest';

import { GuideSearch } from '#src/GuideSearch';

afterEach(() => vi.unstubAllGlobals());

it('applies page and row limits while preserving the default limits', async () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({
        id: `page-${index}`,
        type: 'page' as const,
        content: 'needle',
        url: `/page-${index}`
    }));
    expect(new GuideSearch().rank(rows, 'needle')).toHaveLength(16);
    expect(new GuideSearch(undefined, { pages: 25 }).rank(rows, 'needle')).toHaveLength(25);

    const api = createSearchAPI('advanced', {
        indexes: rows.map((row) => ({
            id: row.id,
            title: row.content,
            url: row.url,
            structuredData: { headings: [], contents: [{ heading: undefined, content: 'needle' }] }
        }))
    });
    const response = await api.staticGET();
    vi.stubGlobal('fetch', () => Promise.resolve(response.clone()));
    expect(await new GuideSearch('https://search.test/default', { pages: 30 }).search('needle')).toHaveLength(60);
    expect(await new GuideSearch('https://search.test/limited', { pages: 30, rows: 25 }).search('needle')).toHaveLength(
        25
    );
});
