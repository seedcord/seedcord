import { toneToDirectory } from '@seedcord/docs-engine/client';

import type { EntityTone, ParsedEntityPath } from '@seedcord/docs-engine/client';
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
 * The same symbol's path in the latest version, as segments. Returns `undefined` when the latest
 * version no longer documents the symbol. A page keeps the segments it came in with when the index
 * carries no entity map, or when that map describes a version other than `latestId`.
 */
export function latestEntitySegments(
    index: { entities?: Record<string, EntityTone>; entitiesVersion?: string } | null | undefined,
    latestId: string,
    { tone, slug, rawSegments }: ParsedEntityPath
): string[] | undefined {
    const entities = index?.entitiesVersion === latestId ? index.entities : undefined;
    if (entities === undefined) return rawSegments;

    // entities['constructor'] finds Object.prototype.constructor without this guard
    const latestTone = slug !== null && Object.hasOwn(entities, slug) ? entities[slug] : undefined;
    if (latestTone === undefined) return undefined;

    // a symbol can change kind between releases
    const directory = toneToDirectory(latestTone);
    return tone === null ? [directory, ...rawSegments] : [directory, ...rawSegments.slice(1)];
}
