import { buildEntityHref } from '#routing/url-builder';
import { memberFragment } from '#src/anchors';
import { kindName } from '#src/kinds';
import { resolveEntityToneStrict } from '#src/tones';

import type { NodeLookup } from '#routing/lookup';
import type { DocNode } from '#src/types';

const ENTITY_RESULT_KINDS = new Set(['class', 'interface', 'enum', 'type', 'function', 'variable']);

function getParentSlug(slug: string): string | null {
    const segments = slug.split('/');
    if (segments.length <= 1) return null;
    return segments.slice(0, -1).join('/');
}

/**
 * Turns a resolved `(packageName, slug)` into a docs URL. The href depends only on that
 * `packageName`, regardless of which package the caller is currently viewing.
 */
export class AnchorStrategy {
    constructor(private readonly lookup: NodeLookup) {}

    hrefFor(packageName: string, slug: string): string {
        const node = this.lookup.getNodeByGlobalSlug(packageName, slug) ?? this.lookup.getNodeBySlug(packageName, slug);

        if (!node) {
            const version = this.lookup.getPackage(packageName)?.manifest.version ?? null;
            return buildEntityHref({ name: packageName, slug, tone: null, version });
        }

        if (node.slug.includes('/')) {
            return this.buildMemberHref(packageName, node);
        }

        const tone = resolveEntityToneStrict(kindName(node.kind));
        return buildEntityHref({
            name: node.sourcePackage.name,
            slug: node.slug,
            tone,
            version: node.sourcePackage.version
        });
    }

    private walkToEntityNode(packageName: string, slug: string): DocNode | null {
        const segments = slug.split('/');

        for (let index = segments.length; index > 0; index -= 1) {
            const candidateSlug = segments.slice(0, index).join('/');
            const candidate =
                this.lookup.getNodeByGlobalSlug(packageName, candidateSlug) ??
                this.lookup.getNodeBySlug(packageName, candidateSlug);
            if (!candidate) continue;

            const normalizedKind = kindName(candidate.kind).toLowerCase();
            if (ENTITY_RESULT_KINDS.has(normalizedKind)) return candidate;
        }

        return null;
    }

    private buildMemberHref(packageName: string, node: DocNode): string {
        const entityNode = this.walkToEntityNode(packageName, node.slug);

        if (entityNode) {
            const entityTone = resolveEntityToneStrict(kindName(entityNode.kind));
            const entityHref = buildEntityHref({
                name: entityNode.sourcePackage.name,
                slug: entityNode.slug,
                tone: entityTone,
                version: entityNode.sourcePackage.version
            });

            const nodeKind = kindName(node.kind).toLowerCase();

            if (nodeKind === 'parameter') {
                const parentSlug = getParentSlug(node.slug);
                if (!parentSlug) return entityHref;
                return this.buildParameterAnchor(packageName, entityHref, parentSlug);
            }

            return `${entityHref}#${memberFragment(node)}`;
        }

        const owner = this.findOwnerNode(packageName, node);
        if (owner) {
            const ownerTone = resolveEntityToneStrict(kindName(owner.kind));
            return buildEntityHref({
                name: owner.sourcePackage.name,
                slug: owner.slug,
                tone: ownerTone,
                version: owner.sourcePackage.version
            });
        }

        return '/404';
    }

    // a `@link` to a parameter resolves to the owning method or constructor anchor, since parameters
    // render inline on the parent's signature
    private buildParameterAnchor(packageName: string, entityHref: string, parentSlug: string): string {
        const parentNode =
            this.lookup.getNodeByGlobalSlug(packageName, parentSlug) ??
            this.lookup.getNodeBySlug(packageName, parentSlug);
        if (!parentNode) return entityHref;

        return `${entityHref}#${memberFragment(parentNode)}`;
    }

    private findOwnerNode(packageName: string, node: DocNode | null): DocNode | null {
        if (!node) return null;
        if (!node.slug.includes('/')) return null;
        if (typeof node.qualifiedName !== 'string' || !node.qualifiedName.includes('.')) return null;

        const ownerQName = node.qualifiedName.split('.').slice(0, -1).join('.');
        return this.lookup.getNodeByQualifiedName(packageName, ownerQName) ?? null;
    }
}
