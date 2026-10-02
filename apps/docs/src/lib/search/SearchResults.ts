import { DocSearch } from '@seedcord/docs-engine/client';

import type { SearchIndexEntry } from './types';
import type { CommandAction, SearchResultKind } from '#components/search/command-palette/types';

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

    rank(query: string, kind: string): CommandAction[] {
        // overload signatures share package, slug and kind
        const seen = new Set<string>();
        const results: CommandAction[] = [];
        for (const entry of this.search.search(query)) {
            if (!SearchResults.matchesKind(entry.action.kind, kind)) continue;

            const key = `${entry.packageName}::${entry.slug}::${entry.action.kind}`;
            if (seen.has(key)) continue;
            seen.add(key);

            results.push(entry.action);
            if (results.length >= MAX_RESULTS) break;
        }
        return results;
    }

    private static matchesKind(kind: SearchResultKind, filter: string): boolean {
        if (filter === 'all') return true;
        if (filter === 'member') return MEMBER_KINDS.has(kind);
        return kind === filter;
    }
}
