import { describe, expect, it } from 'vite-plus/test';

import type { SearchAction, SearchIndexEntry } from '#src/types';

import { DocKind } from '#src/DocKind';
import { SearchResults } from '#src/SearchResults';

function entry(slug: string, kind: SearchAction['kind'], packageName = 'seedcord'): SearchIndexEntry {
    const name = slug.split('/').at(-1) ?? slug;
    return {
        slug,
        name,
        qualifiedName: name,
        packageName,
        kind: kind === 'method' ? DocKind.Method : DocKind.Class,
        tokens: [],
        action: { id: `${packageName}:${slug}:${kind}`, label: name, path: slug, href: `/${slug}`, kind }
    };
}

describe('SearchResults.rank', () => {
    it('keeps only the matching kind', () => {
        const logger = entry('logger', 'class');
        logger.action.href = '/packages/logger/1.0.0/classes/logger#log';
        logger.action.description = 'Writes messages';
        const results = new SearchResults([logger, entry('logger/log', 'method')]);
        expect(results.rank('log', 'class')).toEqual([
            { ...logger, url: 'https://seedcord.org/docs/packages/logger/1.0.0/classes/logger#log' }
        ]);
    });

    it("treats 'member' as any member kind", () => {
        const results = new SearchResults([entry('logger', 'class'), entry('logger/log', 'method')]);
        expect(results.rank('log', 'member').map(({ action }) => action.kind)).toEqual(['method']);
    });

    it('collapses overloads that share package, slug and kind', () => {
        const results = new SearchResults([entry('logger/log', 'method'), entry('logger/log', 'method')]);
        expect(results.rank('log', 'all')).toHaveLength(1);
    });

    it('keeps a same-named entity from another package', () => {
        const results = new SearchResults([entry('logger', 'class'), entry('logger', 'class', '@seedcord/logger')]);
        expect(results.rank('logger', 'all')).toHaveLength(2);
    });

    it('caps results at the requested limit, defaulting to 24', () => {
        const results = new SearchResults(Array.from({ length: 40 }, (_, index) => entry(`entry-${index}`, 'class')));
        expect(results.rank('entry', 'all')).toHaveLength(24);
        expect(results.rank('entry', 'all', 25)).toHaveLength(25);
        expect(results.rank('entry', 'all', 0)).toEqual([]);
    });
});
