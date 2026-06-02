import { findEntityNode, resolveEntityTone } from '@seedcord/docs-engine';

import { buildEntityModel } from './builders/buildEntityModel';

import type { VersionedDocsEngine } from './engine';
import type { EntityModel } from './types';

interface EntityLookup {
    slug?: string;
    symbol?: string;
    qualifiedName?: string;
    kind?: string;
}

// Requires the caller to have run setVersion for the package first; resolves against loaded models only.
export async function loadEntityModel(
    engine: VersionedDocsEngine,
    manifestPackage: string,
    lookup: EntityLookup
): Promise<EntityModel | null> {
    const node = findEntityNode(engine, {
        manifestPackage,
        ...(lookup.slug ? { slug: lookup.slug } : {}),
        ...(lookup.symbol ? { symbol: lookup.symbol } : {}),
        ...(lookup.qualifiedName ? { qualifiedName: lookup.qualifiedName } : {}),
        kind: lookup.kind ? resolveEntityTone(lookup.kind) : null
    });

    if (!node) {
        return null;
    }

    return buildEntityModel(engine, node);
}
