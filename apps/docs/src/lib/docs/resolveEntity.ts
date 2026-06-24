import { parseEntityPathSegments } from '@seedcord/docs-engine';

import { getDocsEngine } from './engine';
import { loadEntityModel } from './loadEntityModel';
import { getCatalogContext } from './pageContext';

import type { PageParams } from './pageContext';
import type { EntityModel, PackageCatalogEntry, PackageVersionCatalog } from './types';

export interface ResolvedEntity {
    entry: PackageCatalogEntry;
    version: PackageVersionCatalog;
    entity: EntityModel;
    segments: string[];
}

function normalizeSegments(raw: string | string[] | undefined): string[] {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') return [raw];
    return [];
}

export async function resolveEntity(params: PageParams): Promise<ResolvedEntity | null> {
    const { entry, version } = await getCatalogContext(params);

    const segments = normalizeSegments(params.entitySegments);
    const parsed = parseEntityPathSegments(segments);
    if (!parsed.slug) return null;

    // one engine instance for setVersion and the lookup. The OG route handler doesn't get React cache()
    // dedup the way a page render does, so a second getDocsEngine() would read a version that was never set.
    const engine = await getDocsEngine();
    try {
        await engine.setVersion(entry.id, version.id);
    } catch {
        return null;
    }

    const entity = await loadEntityModel(engine, entry.manifestName, {
        slug: parsed.slug,
        ...(parsed.tone ? { kind: parsed.tone } : {})
    });
    if (!entity) return null;

    return { entry, version, entity, segments };
}
