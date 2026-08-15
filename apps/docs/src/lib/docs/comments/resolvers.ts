import type { InlineTagPart, FormatContext } from '#lib/docs/types';
import type { VersionedDocsEngine, DocNode, DocReference } from '@seedcord/docs-engine';

function listPackageCandidates(engine: VersionedDocsEngine, currentPackage: string): string[] {
    const ordered = new Set<string>();

    if (currentPackage) {
        ordered.add(currentPackage);
    }

    for (const pkgName of engine.loadedPackages()) {
        ordered.add(pkgName);
    }

    return Array.from(ordered);
}

function resolveNodeById(engine: VersionedDocsEngine, id: number, currentPackage: string): DocNode | null {
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

        return context.engine.resolver().href(context.manifestPackage, reference);
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
            return context.engine.resolver().href(context.manifestPackage, reference as DocReference);
        }

        return null;
    };

    const tryResolveBySearch = (): string | null => {
        const rawLabel = typeof part.text === 'string' ? part.text : '';
        const trimmedLabel = rawLabel.trim();
        if (!trimmedLabel) return null;

        const [candidate] = context.engine.search(trimmedLabel, context.manifestPackage);
        if (!candidate) return null;
        // only an exact name match. an unresolved external ref like ButtonStyle.Danger otherwise takes the
        // fuzzy top hit (HasDangerousPermissions) as its target and links to an unrelated local symbol.
        if (candidate.name !== trimmedLabel) return null;

        const node =
            context.engine.getNodeByGlobalSlug(candidate.packageName, candidate.slug) ??
            context.engine.getNodeBySlug(candidate.packageName, candidate.slug);
        if (!node) return null;

        const reference: DocReference = {
            targetKey: node.key,
            name: node.name,
            packageName: node.packageName
        };

        return context.engine.resolver().href(context.manifestPackage, reference);
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
