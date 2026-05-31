import {
    DEFAULT_MANIFEST_PACKAGE,
    findEntityNode,
    resolveEntityTone,
    resolveManifestPackageName
} from '@seedcord/docs-engine';

import { buildEntityModel } from './builders/buildEntityModel';
import { getDocsEngine } from './engine';

import type { EntityModel, EntityQueryParams } from './types';

export async function loadEntityModel(params: EntityQueryParams): Promise<EntityModel | null> {
    const requestedPackage = params.manifestPackage ?? params.pkg ?? DEFAULT_MANIFEST_PACKAGE;
    const engine = await getDocsEngine();
    const manifestPackage = resolveManifestPackageName(engine, requestedPackage);
    const node = findEntityNode(engine, {
        manifestPackage,
        ...(params.slug ? { slug: params.slug } : {}),
        ...(params.symbol ? { symbol: params.symbol } : {}),
        ...(params.qualifiedName ? { qualifiedName: params.qualifiedName } : {}),
        kind: params.kind ? resolveEntityTone(params.kind) : null
    });

    if (!node) {
        return null;
    }

    return buildEntityModel(engine, node);
}
