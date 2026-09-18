import { toneToDirectory } from '@seedcord/docs-engine/client';

import type { EntityTone } from '@seedcord/docs-engine/client';
import type { ParsedEntityPath } from '@seedcord/docs-engine/client';

/**
 * The same symbol's path in the latest version, as segments. Returns `undefined` when the latest
 * version no longer documents the symbol. A page keeps the segments it came in with when the index
 * carries no entity map.
 */
export function latestEntitySegments(
    entities: Record<string, EntityTone> | undefined,
    { tone, slug, rawSegments }: ParsedEntityPath
): string[] | undefined {
    if (entities === undefined) return rawSegments;

    // entities['constructor'] finds Object.prototype.constructor without this guard
    const latestTone = slug !== null && Object.hasOwn(entities, slug) ? entities[slug] : undefined;
    if (latestTone === undefined) return undefined;

    // a symbol can change kind between releases
    const slugSegments = tone === null ? rawSegments : rawSegments.slice(1);
    return [toneToDirectory(latestTone), ...slugSegments];
}
