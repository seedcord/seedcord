import { notFound } from 'next/navigation';

import { EntityContent } from '@components/docs/entity/EntityContent';
import { plainSummary } from '@lib/docs/plainSummary';
import { resolveEntity } from '@lib/docs/resolveEntity';
import { ENTITY_TONE_HEX } from '@lib/entityColors';
import { SITE_NAME, canonicalUrl, pageMetadata } from '@lib/site';

import type { PageParams } from '@lib/docs/pageContext';
import type { ResolvedEntity } from '@lib/docs/resolveEntity';
import type { Metadata, Viewport } from 'next';
import type { ReactElement } from 'react';

// force-static because entity pages are shiki-heavy, dropping it flips them to slow per-request rendering.
export const dynamic = 'force-static';

function entityPath({ entry, version, segments }: ResolvedEntity): string {
    return `/packages/${entry.id}/${version.id}/${segments.join('/')}`;
}

function entityOgPath({ entry, version, segments }: ResolvedEntity): string {
    return `/og/packages/${entry.id}/${version.id}/${segments.join('/')}`;
}

function entityJsonLd(resolved: ResolvedEntity): Record<string, unknown> {
    const { entry, version, entity } = resolved;
    const url = canonicalUrl(entityPath(resolved));
    const overviewUrl = canonicalUrl(`/packages/${entry.id}/${version.id}`);
    const summary = plainSummary(entity.summary[0]?.plain ?? '');

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'APIReference',
                '@id': `${url}#api`,
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
                '@id': `${url}#breadcrumb`,
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
    // an unresolved path renders a soft-404, keep it out of the index instead of inheriting the root OG/title
    if (!resolved) return { robots: { index: false } };
    const { entity } = resolved;

    const summary = entity.summary[0]?.plain.trim();
    const description =
        summary && summary.length > 0 ? summary : `${entity.name}, a ${entity.kind} in ${entity.displayPackage}.`;

    return pageMetadata({
        title: entity.name,
        description,
        path: entityPath(resolved),
        type: 'article',
        image: entityOgPath(resolved),
        markdownPath: `/llms${entityPath(resolved)}`
    });
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
