import { resolveExternalPackageUrl } from '@packages/identity';
import { crossPackageUrlRef, resolveWithinPackage } from '@routing/resolve-helpers';
import { buildEntityHref } from '@routing/url-builder';

import type { AnchorStrategy } from '@routing/AnchorStrategy';
import type { NodeLookup, PackageRegistry, RefTarget } from '@routing/lookup';
import type { DocReference } from '@src/types';

/**
 * Turns a `DocReference` into a target, composed over a {@link NodeLookup} and a {@link PackageRegistry}
 * (which packages exist vs are loaded), both from the engine. `resolve` yields a {@link RefTarget};
 * `href` adds the {@link AnchorStrategy}, the external-link table, and the qualified-name fallback.
 */
export class ReferenceResolver {
    constructor(
        private readonly lookup: NodeLookup,
        private readonly registry: PackageRegistry,
        private readonly anchors: AnchorStrategy
    ) {}

    resolve(currentPackage: string, reference: DocReference | null): RefTarget {
        if (!reference) return { kind: 'unresolved' };
        if (reference.externalUrl) return { kind: 'external', url: reference.externalUrl };

        if (reference.targetKey) {
            const node = this.lookup.getNodeByKey(reference.targetKey);
            if (node) return { kind: 'internal', packageName: node.packageName, slug: node.slug };
        }

        const candidates = this.registry.candidatePackages(currentPackage, reference.packageName);

        for (const name of candidates) {
            const pkg = this.lookup.getPackage(name);
            if (!pkg) continue;
            const resolved = resolveWithinPackage(reference, pkg);
            if (resolved) return { kind: 'internal', packageName: pkg.manifest.name, slug: resolved.slug };
        }

        if (reference.qualifiedName) {
            for (const name of candidates) {
                const node = this.lookup.getNodeByQualifiedName(name, reference.qualifiedName);
                if (node) return { kind: 'internal', packageName: node.packageName, slug: node.slug };
            }
        }

        return this.resolveCrossPackage(reference) ?? { kind: 'unresolved' };
    }

    // Emit a cross-package ref only for a known package whose index lists the target as a real
    // entity. The lazy engine does not load the package to check, so without this gate it builds
    // 404 links for params/predicates and mis-attributed externals (e.g. EventEmitter). An unknown
    // package (discord.js) or an unverifiable slug returns null, falling through to the external-URL table.
    private resolveCrossPackage(reference: DocReference): RefTarget | null {
        if (!reference.packageName || !this.registry.isKnownPackage(reference.packageName)) return null;

        const { slug } = crossPackageUrlRef(reference);
        if (!slug) return null;

        if (this.registry.crossPackageEntity(reference.packageName, slug)) {
            return { kind: 'internal', packageName: reference.packageName, slug };
        }

        // The owner may be mis-attributed (API-Extractor bundledPackages): re-home to the package that
        // actually exports this entity.
        const rehomed = this.registry.findEntityAcrossPackages(slug);
        return rehomed ? { kind: 'internal', packageName: rehomed.fullName, slug } : null;
    }

    href(currentPackage: string, reference: DocReference | null): string | null {
        const target = this.resolve(currentPackage, reference);
        if (target.kind === 'external') return target.url;
        if (target.kind === 'internal') return this.internalHref(target.packageName, target.slug);

        if (!reference) return null;

        // The owning package first (e.g. `mongoose` for `mongoose.Schema`), then the symbol name
        // (e.g. `Writable`, keyed directly in the external-link table): a single `??` covers only one.
        const fallbackUrl =
            resolveExternalPackageUrl(reference.packageName) ?? resolveExternalPackageUrl(reference.name);
        if (fallbackUrl) return fallbackUrl;

        if (reference.qualifiedName) {
            const node = this.lookup.getNodeByQualifiedName(currentPackage, reference.qualifiedName);
            if (node) return this.anchors.hrefFor(node.packageName, node.slug);
        }

        return null;
    }

    // A loaded node gets the member-aware anchor; an unloaded cross-package target builds its URL from
    // the index entity map so it carries the right tone directory + concrete version (not /latest).
    private internalHref(packageName: string, slug: string): string {
        const loaded =
            this.lookup.getNodeByGlobalSlug(packageName, slug) ?? this.lookup.getNodeBySlug(packageName, slug);
        if (loaded) return this.anchors.hrefFor(packageName, slug);

        const entity = this.registry.crossPackageEntity(packageName, slug);
        if (entity) {
            const base = buildEntityHref({
                name: packageName,
                slug: entity.entitySlug,
                tone: entity.tone,
                version: entity.version
            });
            return entity.fragment ? `${base}#${entity.fragment}` : base;
        }

        return this.anchors.hrefFor(packageName, slug);
    }
}
