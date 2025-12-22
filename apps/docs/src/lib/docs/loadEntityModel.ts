import { kindName, type DocNode, type DocPackageModel, type DocsEngine } from '@seedcord/docs-engine';

import { resolveEntityTone } from '@lib/entityMetadata';

import { buildEntityModel } from './builders/buildEntityModel';
import { getDocsEngine } from './engine';
import { resolveManifestPackageName } from './packages';

import type { InternalEntityLookupParams, EntityQueryParams, EntityKind, EntityModel } from './types';

export const DEFAULT_PACKAGE = 'seedcord';

function normalizeKind(kind: string | undefined): EntityKind | null {
    if (!kind) {
        return null;
    }

    return resolveEntityTone(kind);
}

function matchesKind(node: DocNode, kind: EntityKind | null): boolean {
    if (!kind) {
        return true;
    }

    const nodeKind = resolveEntityTone(kindName(node.kind));
    return nodeKind === kind;
}

function pickPreferredNode(nodes: DocNode[]): DocNode | null {
    if (!nodes.length) {
        return null;
    }

    const [preferred] = [...nodes].sort((a, b) => {
        if (a.path.length !== b.path.length) {
            return a.path.length - b.path.length;
        }

        if (a.name !== b.name) {
            return a.name.localeCompare(b.name);
        }

        return a.slug.localeCompare(b.slug);
    });

    return preferred ?? null;
}

function findNodeBySlug(engine: DocsEngine, manifestPackage: string, slug: string): DocNode | null {
    return engine.getNodeByGlobalSlug(manifestPackage, slug) ?? engine.getNodeBySlug(manifestPackage, slug) ?? null;
}

function findNodeByQualifiedName(engine: DocsEngine, manifestPackage: string, qualifiedName: string): DocNode | null {
    return engine.getNodeByQualifiedName(manifestPackage, qualifiedName);
}

function listPackageNodes(engine: DocsEngine, manifestPackage: string): DocNode[] {
    const pkg: DocPackageModel | null = engine.getPackage(manifestPackage);
    if (!pkg) {
        return [];
    }

    return Array.from(pkg.nodes.values());
}

function findNodeByName(
    engine: DocsEngine,
    manifestPackage: string,
    symbol: string,
    kind: EntityKind | null
): DocNode | null {
    const nodes = listPackageNodes(engine, manifestPackage).filter((candidate) => candidate.name === symbol);

    if (kind) {
        const kindMatches = nodes.filter((candidate) => matchesKind(candidate, kind));
        if (kindMatches.length) {
            return pickPreferredNode(kindMatches);
        }
    }

    if (nodes.length) {
        return pickPreferredNode(nodes);
    }

    const [searchResult] = engine.search(symbol, manifestPackage);
    if (searchResult?.packageName) {
        const node = findNodeBySlug(engine, searchResult.packageName, searchResult.slug);
        if (node && matchesKind(node, kind)) {
            return node;
        }

        return node;
    }

    return null;
}

function findEntityNode(engine: DocsEngine, params: InternalEntityLookupParams): DocNode | null {
    const { manifestPackage, slug, qualifiedName, symbol, kind } = params;

    if (slug) {
        const node = findNodeBySlug(engine, manifestPackage, slug);
        if (node) {
            return node;
        }
    }

    if (qualifiedName) {
        const node = findNodeByQualifiedName(engine, manifestPackage, qualifiedName);
        if (node && matchesKind(node, kind)) {
            return node;
        }
    }

    if (symbol) {
        const node = findNodeByName(engine, manifestPackage, symbol, kind);
        if (node) {
            return node;
        }
    }

    return null;
}

export async function loadEntityModel(params: EntityQueryParams): Promise<EntityModel | null> {
    const requestedPackage = params.manifestPackage ?? params.pkg ?? DEFAULT_PACKAGE;
    const engine = await getDocsEngine();
    const manifestPackage = resolveManifestPackageName(engine, requestedPackage);
    const node = findEntityNode(engine, {
        manifestPackage,
        ...(params.slug ? { slug: params.slug } : {}),
        ...(params.symbol ? { symbol: params.symbol } : {}),
        ...(params.qualifiedName ? { qualifiedName: params.qualifiedName } : {}),
        kind: normalizeKind(params.kind)
    });

    if (!node) {
        return null;
    }

    return buildEntityModel(engine, node);
}
