import { GUIDE } from '@seedcord/ui/sites';
import { staticClient } from 'fumadocs-core/search/client/orama-static';

import { GUIDE_SEARCH_URL } from '#src/files';
import { firstPages } from '#src/firstPages';
import { rankByCoverage } from '#src/rankByCoverage';
import { stripStopwords } from '#src/stripStopwords';

import type { SortedResult } from 'fumadocs-core/search';

// a common term matches most of the guide
const MAX_PAGES = 16;

export class GuideSearch {
    readonly client: ReturnType<typeof staticClient>;

    constructor(
        endpoint = GUIDE_SEARCH_URL,
        private readonly limits: { pages?: number; rows?: number } = {}
    ) {
        // tolerance is the edit distance zbsearch allows. 1 covers a single typo
        this.client = staticClient({
            from: endpoint,
            search: { tolerance: 1, ...(limits.rows !== undefined && { limit: limits.rows }) }
        });
    }

    rank(results: readonly SortedResult[], terms: string): SortedResult[] {
        return firstPages(rankByCoverage(results, terms), this.limits.pages ?? MAX_PAGES);
    }

    async search(query: string): Promise<SortedResult[]> {
        const terms = stripStopwords(query);
        if (terms.length === 0) return [];

        const results = await this.client.search(terms);
        return this.rank(results, terms).map((result) => ({ ...result, url: GUIDE.at(result.url) }));
    }
}

export type GuideSearchResult = Awaited<ReturnType<GuideSearch['search']>>[number];
