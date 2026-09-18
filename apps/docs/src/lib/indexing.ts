import type { Metadata } from 'next';

export interface IndexingChoice {
    canonicalPath?: string;
    robots?: Metadata['robots'];
}

/**
 * Where a versioned docs page sends search engines.
 *
 * Pass the path of the same page in the latest version. The latest version itself passes its own
 * path. Pass `undefined` once the latest version has dropped the symbol.
 */
export function indexingFor(latestPath: string | undefined): IndexingChoice {
    // google merges a canonical between near-duplicates. a dropped symbol has no page to merge into
    if (latestPath === undefined) return { robots: { index: false, follow: true } };

    return { canonicalPath: latestPath };
}

/**
 * Whether the latest version still documents a slug. An index built before `entities` shipped
 * carries none. Every page there keeps its canonical.
 */
export function latestHasEntity(entities: Record<string, unknown> | undefined, slug: string | null): boolean {
    if (entities === undefined) return true;

    // a slug called `constructor` or `toString` answers true without this
    return slug !== null && Object.hasOwn(entities, slug);
}
