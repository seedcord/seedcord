import { DOCS } from '@seedcord/ui/sites';

import { DocSearch } from '#src/DocSearch';

import type { KindFilter, ReferenceSearchResult, SearchIndexEntry, SearchResultKind } from '#src/types';

const MAX_RESULTS = 24;

const MEMBER_KINDS = new Set<SearchResultKind>([
    'constructor',
    'method',
    'property',
    'parameter',
    'typeParameter',
    'enumMember'
]);

export class SearchResults {
    private readonly search: DocSearch<SearchIndexEntry>;

    constructor(entries: readonly SearchIndexEntry[]) {
        this.search = new DocSearch(entries);
    }

    rank(query: string, kind: KindFilter = 'all', limit = MAX_RESULTS): ReferenceSearchResult[] {
        if (limit <= 0) return [];
        // overload signatures share package, slug and kind
        const seen = new Set<string>();
        const results: ReferenceSearchResult[] = [];
        for (const entry of this.search.search(query)) {
            if (!SearchResults.matchesKind(entry.action.kind, kind)) continue;

            const key = `${entry.packageName}::${entry.slug}::${entry.action.kind}`;
            if (seen.has(key)) continue;
            seen.add(key);

            results.push({ ...entry, url: DOCS.at(entry.action.href) });
            if (results.length >= limit) break;
        }
        return results;
    }

    private static matchesKind(kind: SearchResultKind, filter: KindFilter): boolean {
        if (filter === 'all') return true;
        if (filter === 'member') return MEMBER_KINDS.has(kind);
        return kind === filter;
    }
}
