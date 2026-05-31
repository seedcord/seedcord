import { kindName, type DocReference, type DocsEngine, type DocNode } from '@seedcord/docs-engine';

import { resolveEntityTone } from '@lib/entityMetadata';

import { memberFragment } from './anchors';
import { resolveExternalPackageUrl } from './packages';
import { buildEntityHref } from './routes';

interface ResolveReferenceOptions {
    engine: DocsEngine;
    currentPackage: string;
}

const ENTITY_RESULT_KINDS = new Set(['class', 'interface', 'enum', 'type', 'function', 'variable']);

function getParentSlug(slug: string): string | null {
    const segments = slug.split('/');
    if (segments.length <= 1) return null;
    return segments.slice(0, -1).join('/');
}

function findEntityNode(engine: DocsEngine, packageName: string, slug: string): DocNode | null {
    const segments = slug.split('/');

    for (let index = segments.length; index > 0; index -= 1) {
        const candidateSlug = segments.slice(0, index).join('/');
        const candidate =
            engine.getNodeByGlobalSlug(packageName, candidateSlug) ?? engine.getNodeBySlug(packageName, candidateSlug);
        if (!candidate) continue;

        const normalizedKind = kindName(candidate.kind).toLowerCase();
        if (ENTITY_RESULT_KINDS.has(normalizedKind)) return candidate;
    }

    return null;
}

function buildInternalHref(engine: DocsEngine, packageName: string, slug: string): string {
    const node = engine.getNodeByGlobalSlug(packageName, slug) ?? engine.getNodeBySlug(packageName, slug);

    if (!node) {
        const version = engine.getPackage(packageName)?.manifest.version ?? null;

        return buildEntityHref({
            name: packageName,
            slug,
            tone: null,
            version
        });
    }

    if (node.slug.includes('/')) {
        return buildMemberHrefFromNode(engine, packageName, node);
    }

    const tone = resolveEntityTone(kindName(node.kind));

    return buildEntityHref({
        name: node.sourcePackage.name,
        slug: node.slug,
        tone,
        version: node.sourcePackage.version
    });
}

function buildMemberHrefFromNode(engine: DocsEngine, packageName: string, node: DocNode): string {
    const entityNode = findEntityNode(engine, packageName, node.slug);

    if (entityNode) {
        const entityTone = resolveEntityTone(kindName(entityNode.kind));

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

            return buildParameterAnchor(engine, packageName, entityHref, parentSlug);
        }

        return `${entityHref}#${memberFragment(node)}`;
    }

    const owner = findOwnerNode(engine, packageName, node);
    if (owner) {
        const ownerTone = resolveEntityTone(kindName(owner.kind));

        return buildEntityHref({
            name: owner.sourcePackage.name,
            slug: owner.slug,
            tone: ownerTone,
            version: owner.sourcePackage.version
        });
    }

    return '/docs/404';
}

// A `@link` to a parameter resolves to the owning method/constructor anchor; parameters
// render inline on the parent's signature, not as their own scroll target.
function buildParameterAnchor(engine: DocsEngine, packageName: string, entityHref: string, parentSlug: string): string {
    const parentNode =
        engine.getNodeByGlobalSlug(packageName, parentSlug) ?? engine.getNodeBySlug(packageName, parentSlug);
    if (!parentNode) return entityHref;

    return `${entityHref}#${memberFragment(parentNode)}`;
}

function findOwnerNode(engine: DocsEngine, packageName: string, node: DocNode | null): DocNode | null {
    if (!node) return null;
    if (!node.slug.includes('/')) return null;
    if (typeof node.qualifiedName !== 'string' || !node.qualifiedName.includes('.')) return null;

    const ownerQName = node.qualifiedName.split('.').slice(0, -1).join('.');
    return engine.getNodeByQualifiedName(packageName, ownerQName) ?? null;
}

export function resolveReferenceHref(
    reference: DocReference | null | undefined,
    options: ResolveReferenceOptions
): string | null {
    if (!reference) return null;

    const { engine, currentPackage } = options;

    if (reference.externalUrl) return reference.externalUrl;

    const resolved = engine.resolveReference(currentPackage, reference);

    if (resolved.externalUrl) return resolved.externalUrl;

    if (resolved.packageName && resolved.slug) return buildInternalHref(engine, resolved.packageName, resolved.slug);

    const packageName = reference.packageName ?? reference.name;
    const fallbackUrl = resolveExternalPackageUrl(packageName);
    if (fallbackUrl) return fallbackUrl;

    if (reference.qualifiedName) {
        const node = engine.getNodeByQualifiedName(currentPackage, reference.qualifiedName);
        if (node) return buildInternalHref(engine, node.packageName, node.slug);
    }

    return null;
}
