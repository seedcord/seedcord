import { parseEntityPathSegments } from '@seedcord/docs-engine';
import { notFound } from 'next/navigation';

import { EntityContent } from '@components/docs/entity/EntityContent';
import { loadActiveVersion } from '@lib/docs/catalog';
import { getDocsEngine } from '@lib/docs/engine';
import { loadEntityModel } from '@lib/docs/loadEntityModel';
import { getCatalogContext } from '@lib/docs/pageContext';

import type { PageParams } from '@lib/docs/pageContext';
import type { ReactElement } from 'react';

// Prerendered + cached on first request: entity pages are shiki-heavy, too slow to render per request.
export const dynamic = 'force-static';

function normalizeSegments(raw: string | string[] | undefined): string[] {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') return [raw];
    return [];
}

async function PackageEntityPage({ params }: { params: Promise<PageParams> }): Promise<ReactElement> {
    const resolvedParams = await params;
    const { entry, version } = await getCatalogContext(resolvedParams);

    // loadEntityModel resolves against loaded models only, so setVersion must run first.
    await loadActiveVersion(entry.id, version.id);

    const parsedSegments = parseEntityPathSegments(normalizeSegments(resolvedParams.entitySegments));
    if (!parsedSegments.slug) {
        notFound();
    }

    const engine = await getDocsEngine();
    const entity = await loadEntityModel(engine, entry.manifestName, {
        slug: parsedSegments.slug,
        ...(parsedSegments.tone ? { kind: parsedSegments.tone } : {})
    });

    if (!entity) {
        notFound();
    }

    return <EntityContent model={entity} />;
}

export default PackageEntityPage;
