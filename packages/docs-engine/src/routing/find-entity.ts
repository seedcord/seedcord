import { kindName } from '@src/kinds';
import { resolveEntityToneStrict, type EntityTone } from '@src/tones';

import type { VersionedDocsEngine } from '@remote/VersionedDocsEngine';
import type { DocsEngine } from '@src/DocsEngine';
import type { DocNode, DocPackageModel } from '@src/types';

type LookupEngine = DocsEngine | VersionedDocsEngine;

export interface EntityLookupParams {
    manifestPackage: string;
    slug?: string;
    symbol?: string;
    qualifiedName?: string;
    kind: EntityTone | null;
}

function matchesKind(node: DocNode, kind: EntityTone | null): boolean {
    if (!kind) {
        return true;
    }

    // Strict: a non-entity kind (accessor, constructor) resolves to null and matches no tone filter,
    // rather than collapsing into 'class'.
    return resolveEntityToneStrict(kindName(node.kind)) === kind;
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

function findNodeBySlug(engine: LookupEngine, manifestPackage: string, slug: string): DocNode | null {
    return engine.getNodeByGlobalSlug(manifestPackage, slug) ?? engine.getNodeBySlug(manifestPackage, slug) ?? null;
}

function findNodeByQualifiedName(engine: LookupEngine, manifestPackage: string, qualifiedName: string): DocNode | null {
    return engine.getNodeByQualifiedName(manifestPackage, qualifiedName);
}

function listPackageNodes(engine: LookupEngine, manifestPackage: string): DocNode[] {
    const pkg: DocPackageModel | null = engine.getPackage(manifestPackage);
    if (!pkg) {
        return [];
    }

    return Array.from(pkg.nodes.values());
}

function findNodeByName(
    engine: LookupEngine,
    manifestPackage: string,
    symbol: string,
    kind: EntityTone | null
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

    // Search is the last-resort fallback; like the by-name fallback above it accepts the hit
    // regardless of kind.
    const [searchResult] = engine.search(symbol, manifestPackage);
    if (searchResult?.packageName) {
        return findNodeBySlug(engine, searchResult.packageName, searchResult.slug);
    }

    return null;
}

export function findEntityNode(engine: LookupEngine, params: EntityLookupParams): DocNode | null {
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
