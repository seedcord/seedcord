import { DocKind } from '@seedcord/docs-engine/client';
import { describe, expect, it } from 'vitest';

import { SearchResults } from '#lib/search/SearchResults';

import type { CommandAction } from '#components/search/command-palette/types';
import type { SearchIndexEntry } from '#lib/search/types';

function entry(slug: string, kind: CommandAction['kind'], packageName = 'seedcord'): SearchIndexEntry {
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
        const results = new SearchResults([entry('logger', 'class'), entry('logger/log', 'method')]);
        expect(results.rank('log', 'class').map((action) => action.kind)).toEqual(['class']);
    });

    it("treats 'member' as any member kind", () => {
        const results = new SearchResults([entry('logger', 'class'), entry('logger/log', 'method')]);
        expect(results.rank('log', 'member').map((action) => action.kind)).toEqual(['method']);
    });

    it('collapses overloads that share package, slug and kind', () => {
        const results = new SearchResults([entry('logger/log', 'method'), entry('logger/log', 'method')]);
        expect(results.rank('log', 'all')).toHaveLength(1);
    });

    it('keeps a same-named entity from another package', () => {
        const results = new SearchResults([entry('logger', 'class'), entry('logger', 'class', '@seedcord/logger')]);
        expect(results.rank('logger', 'all')).toHaveLength(2);
    });

    it('caps the results at 24', () => {
        const results = new SearchResults(Array.from({ length: 40 }, (_, index) => entry(`entry-${index}`, 'class')));
        expect(results.rank('entry', 'all')).toHaveLength(24);
    });
});
