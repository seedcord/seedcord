import { buildPackageBasePath, DEFAULT_VERSION, parseEntityPathSegments } from '@seedcord/docs-engine';
import { notFound } from 'next/navigation';

import { EntityContent } from '#components/docs/entity/EntityContent';
import { DocsPage } from '#lib/docs/DocsPage';
import { getDocsEngine } from '#lib/docs/engine';
import { entityJsonLd, entityPath } from '#lib/docs/entityJsonLd';
import { resolveEntity } from '#lib/docs/resolveEntity';
import { ENTITY_TONE_HEX } from '#lib/entityColors';
import { latestEntitySegments } from '#lib/indexing';

import type { PageParams } from '#lib/docs/pageContext';
import type { ResolvedEntity } from '#lib/docs/resolveEntity';
import type { Metadata, Viewport } from 'next';
import type { ReactElement } from 'react';

// force-static because entity pages are shiki-heavy, and dropping it flips them to slow per-request rendering
export const dynamic = 'force-static';

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
    const resolved = await resolveEntity(await params);
    // an unresolved path renders a soft-404, so this keeps it out of the index.
    // it would otherwise inherit the root's og image and title
    if (!resolved) return { robots: { index: false } };

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

    return `${buildPackageBasePath(entry.manifestName, DEFAULT_VERSION)}/${inLatest.join('/')}`;
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
    const jsonLd = entityJsonLd(resolved, resolved.version.isLatest ? await pathInLatest(resolved) : undefined);

    return (
        <>
            <script
                type="application/ld+json"
                // escape < so the JSON can't break out of the script tag
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c')
                }}
            />
            <EntityContent model={resolved.entity} />
        </>
    );
}

export default PackageEntityPage;
