import { parseEntityPathSegments } from '@seedcord/docs-engine';
import { notFound } from 'next/navigation';

import { EntityContent } from '@components/docs/entity/EntityContent';
import { loadActiveVersion } from '@lib/docs/catalog';
import { getDocsEngine } from '@lib/docs/engine';
import { loadEntityModel } from '@lib/docs/loadEntityModel';
import { getCatalogContext } from '@lib/docs/pageContext';
import { ENTITY_TONE_HEX } from '@lib/entityColors';
import { SITE_NAME, canonicalUrl, pageMetadata } from '@lib/site';

import type { PageParams } from '@lib/docs/pageContext';
import type { EntityModel, PackageCatalogEntry, PackageVersionCatalog } from '@lib/docs/types';
import type { Metadata, Viewport } from 'next';
import type { ReactElement } from 'react';

// prerendered + cached on first request: entity pages are shiki-heavy, too slow to render per request.
export const dynamic = 'force-static';

interface ResolvedEntity {
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

// loadEntityModel reads loaded models only, so loadActiveVersion (setVersion) must run first.
async function resolveEntity(params: PageParams): Promise<ResolvedEntity | null> {
    const { entry, version } = await getCatalogContext(params);
    await loadActiveVersion(entry.id, version.id);

    const segments = normalizeSegments(params.entitySegments);
    const parsed = parseEntityPathSegments(segments);
    if (!parsed.slug) return null;

    const engine = await getDocsEngine();
    const entity = await loadEntityModel(engine, entry.manifestName, {
        slug: parsed.slug,
        ...(parsed.tone ? { kind: parsed.tone } : {})
    });
    if (!entity) return null;

    return { entry, version, entity, segments };
}

function entityPath({ entry, version, segments }: ResolvedEntity): string {
    return `/packages/${entry.id}/${version.id}/${segments.join('/')}`;
}

function entityJsonLd(resolved: ResolvedEntity): Record<string, unknown> {
    const { entry, version, entity } = resolved;
    const url = canonicalUrl(entityPath(resolved));
    const overviewUrl = canonicalUrl(`/packages/${entry.id}/${version.id}`);
    const summary = entity.summary[0]?.plain.trim();

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'APIReference',
                name: entity.name,
                ...(summary ? { description: summary } : {}),
                url,
                programmingLanguage: 'TypeScript',
                executableLibraryName: entity.displayPackage,
                assemblyVersion: version.id,
                isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: canonicalUrl('/') }
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Docs', item: canonicalUrl('/') },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: `${entity.displayPackage} ${version.label}`,
                        item: overviewUrl
                    },
                    { '@type': 'ListItem', position: 3, name: entity.name, item: url }
                ]
            }
        ]
    };
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
    const resolved = await resolveEntity(await params);
    if (!resolved) return {};
    const { entity } = resolved;

    const summary = entity.summary[0]?.plain.trim();
    const description =
        summary && summary.length > 0 ? summary : `${entity.name}, a ${entity.kind} in ${entity.displayPackage}.`;

    return pageMetadata({ title: entity.name, description, path: entityPath(resolved), type: 'article' });
}

export async function generateViewport({ params }: { params: Promise<PageParams> }): Promise<Viewport> {
    const resolved = await resolveEntity(await params);
    if (!resolved) return {};
    const hex = ENTITY_TONE_HEX[resolved.entity.kind];
    return {
        themeColor: [
            { media: '(prefers-color-scheme: light)', color: hex.light },
            { media: '(prefers-color-scheme: dark)', color: hex.dark }
        ]
    };
}

async function PackageEntityPage({ params }: { params: Promise<PageParams> }): Promise<ReactElement> {
    const resolved = await resolveEntity(await params);
    if (!resolved) notFound();

    return (
        <>
            <script
                type="application/ld+json"
                // escape < so the JSON can't break out of the script tag
                dangerouslySetInnerHTML={{ __html: JSON.stringify(entityJsonLd(resolved)).replace(/</g, '\\u003c') }}
            />
            <EntityContent model={resolved.entity} />
        </>
    );
}

export default PackageEntityPage;
