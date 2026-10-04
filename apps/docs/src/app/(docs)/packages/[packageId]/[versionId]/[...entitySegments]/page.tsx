import { DEFAULT_VERSION, parseEntityPathSegments } from '@seedcord/docs-engine';
import { notFound } from 'next/navigation';

import { EntityContent } from '#components/docs/entity/EntityContent';
import { DocsPage } from '#lib/docs/DocsPage';
import { getDocsEngine } from '#lib/docs/engine';
import { entityJsonLd, entityPagePath, entityPath } from '#lib/docs/entityJsonLd';
import { symbolPreview } from '#lib/docs/linkPreview';
import { PreviewCard } from '@seedcord/ui/LinkPreview';
import { ComponentEmbed } from 'discord-component-embed/react';
import { resolveEntity } from '#lib/docs/resolveEntity';
import { ENTITY_TONE_HEX } from '#lib/entityColors';
import { latestEntitySegments } from '#lib/indexing';

import type { PageParams } from '#lib/docs/pageContext';
import type { ResolvedEntity } from '#lib/docs/resolveEntity';
import type { Metadata, Viewport } from 'next';
import type { ReactElement } from 'react';

export const dynamic = 'force-static';
export { entityParams as generateStaticParams } from '#lib/docs/DocsRoute';

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
    const resolved = await resolveEntity(await params);
    if (!resolved) notFound();

    const page = DocsPage.forEntity(
        entityPath(resolved),
        resolved.entity,
        resolved.version,
        await pathInLatest(resolved)
    );
    return page.metadata();
}

// getEntry reads the index alone. resolveEntity would move the engine off this page's version
async function pathInLatest({ entry, segments }: ResolvedEntity): Promise<string | undefined> {
    const engine = await getDocsEngine();
    const index = await engine.getEntry(entry.id);
    const inLatest = latestEntitySegments(index?.entities, parseEntityPathSegments(segments));
    if (!inLatest) return undefined;

    return entityPagePath(entry.manifestName, DEFAULT_VERSION, inLatest);
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
    const latestPath = await pathInLatest(resolved);
    const jsonLd = entityJsonLd(resolved, resolved.version.isLatest ? latestPath : undefined);

    return (
        <>
            <ComponentEmbed>
                <PreviewCard {...symbolPreview(resolved, latestPath)} />
            </ComponentEmbed>
            <script
                type="application/ld+json"
                // a raw < in the JSON would end the script tag
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c')
                }}
            />
            <EntityContent model={resolved.entity} />
        </>
    );
}

export default PackageEntityPage;
