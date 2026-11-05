import { PRODUCTION_SITES } from '@seedcord/brand';

import type { KindFilter, ReferenceSearchResult, SearchIndexEntry, SearchResultKind } from '#src/types';

import { DocSearch } from '#src/DocSearch';

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
    private readonly byId: Map<string, SearchIndexEntry>;
    private readonly search: DocSearch<SearchIndexEntry>;

    constructor(entries: readonly SearchIndexEntry[]) {
        // overload signatures share one id
        this.byId = new Map(entries.map((entry) => [entry.action.id, entry]));
        this.search = new DocSearch([...this.byId.values()]);
    }

    get(id: string): ReferenceSearchResult | undefined {
        const entry = this.byId.get(id);
        return entry && SearchResults.result(entry);
    }

    rank(query: string, kind: KindFilter = 'all', limit = MAX_RESULTS): ReferenceSearchResult[] {
        if (limit <= 0) return [];
        const results: ReferenceSearchResult[] = [];
        for (const entry of this.search.search(query)) {
            if (!SearchResults.matchesKind(entry.action.kind, kind)) continue;

            results.push(SearchResults.result(entry));
            if (results.length >= limit) break;
        }
        return results;
    }

    private static result(entry: SearchIndexEntry): ReferenceSearchResult {
        return { ...entry, url: PRODUCTION_SITES.docs.at(entry.action.href) };
    }

    private static matchesKind(kind: SearchResultKind, filter: KindFilter): boolean {
        if (filter === 'all') return true;
        if (filter === 'member') return MEMBER_KINDS.has(kind);
        return kind === filter;
    }
}
