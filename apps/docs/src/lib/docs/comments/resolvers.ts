import { resolveReferenceHref } from '../resolveReferenceHref';

import type { InlineTagPart, FormatContext } from '../types';
import type { DocsEngine, DocNode, DocReference } from '@seedcord/docs-engine';

function listPackageCandidates(engine: DocsEngine, currentPackage: string): string[] {
    const ordered = new Set<string>();

    if (currentPackage) {
        ordered.add(currentPackage);
    }

    for (const pkgName of engine.listPackages()) {
        ordered.add(pkgName);
    }

    return Array.from(ordered);
}

function resolveNodeById(engine: DocsEngine, id: number, currentPackage: string): DocNode | null {
    for (const pkgName of listPackageCandidates(engine, currentPackage)) {
        const pkg = engine.getPackage(pkgName);
        const node = pkg?.nodes.get(id);
        if (node) {
            return node;
        }
    }

    return null;
}

export function resolveInlineHref(part: InlineTagPart, context: FormatContext): string | null {
    const tryResolveNumberTarget = (): string | null => {
        if (typeof part.target !== 'number') return null;
        const node = resolveNodeById(context.engine, part.target, context.manifestPackage);
        if (!node) return null;

        const reference: DocReference = {
            targetKey: node.key,
            name: node.name,
            packageName: node.packageName
        };

        return resolveReferenceHref(reference, { engine: context.engine, currentPackage: context.manifestPackage });
    };

    const tryResolveStringTarget = (): string | null => {
        if (typeof part.target !== 'string') return null;
        const normalized = part.target.trim();
        if (normalized.startsWith('http://') || normalized.startsWith('https://')) return normalized;
        return null;
    };

    const tryResolveUrlProp = (): string | null => {
        if (typeof part.url === 'string' && part.url.length > 0) return part.url;
        return null;
    };

    const tryResolveObjectTarget = (): string | null => {
        if (!part.target || typeof part.target !== 'object') return null;
        const t = part.target as Partial<DocReference>;

        const reference: Partial<DocReference> = {};
        if (typeof t.name === 'string') reference.name = t.name;
        if (typeof t.packageName === 'string') reference.packageName = t.packageName;
        if (typeof t.qualifiedName === 'string') reference.qualifiedName = t.qualifiedName;
        if (typeof t.externalUrl === 'string') reference.externalUrl = t.externalUrl;

        if (reference.name || reference.packageName || reference.qualifiedName || reference.externalUrl) {
            return resolveReferenceHref(reference as DocReference, {
                engine: context.engine,
                currentPackage: context.manifestPackage
            });
        }

        return null;
    };

    const tryResolveBySearch = (): string | null => {
        const rawLabel = typeof part.text === 'string' ? part.text : '';
        const trimmedLabel = rawLabel.trim();
        if (!trimmedLabel) return null;

        const [candidate] = context.engine.search(trimmedLabel, context.manifestPackage);
        if (!candidate) return null;

        const node =
            context.engine.getNodeByGlobalSlug(candidate.packageName, candidate.slug) ??
            context.engine.getNodeBySlug(candidate.packageName, candidate.slug);
        if (!node) return null;

        const reference: DocReference = {
            targetKey: node.key,
            name: node.name,
            packageName: node.packageName
        };

        return resolveReferenceHref(reference, { engine: context.engine, currentPackage: context.manifestPackage });
    };

    return (
        tryResolveNumberTarget() ??
        tryResolveStringTarget() ??
        tryResolveUrlProp() ??
        tryResolveObjectTarget() ??
        tryResolveBySearch() ??
        null
    );
}

export function resolveOptions(context: FormatContext): { engine: DocsEngine; currentPackage: string } {
    return { engine: context.engine, currentPackage: context.manifestPackage };
}
