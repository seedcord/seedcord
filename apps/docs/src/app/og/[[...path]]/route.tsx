import { DOCS } from '@seedcord/ui';
import { OgPageCard } from '@seedcord/ui/OgCard';
import { OG_SIZE } from '@seedcord/ui/og';
import { CARD } from '@seedcord/ui/page-asset';
import { ImageResponse } from 'next/og';

import { findPackageVersion } from '#lib/docs/catalog';
import { entityCard, notFoundCard, packageCard, rootCard } from '#lib/docs/DocsPage';
import { DocsRoute, docsRoutes } from '#lib/docs/DocsRoute';
import { resolveEntity } from '#lib/docs/resolveEntity';
import { OG_FONTS } from '#lib/og/fonts';

import type { DocsCard } from '#lib/docs/DocsPage';

export const dynamic = 'force-static';

function render(card: DocsCard): ImageResponse {
    return new ImageResponse(<OgPageCard {...card} domain={DOCS.label} />, { ...OG_SIZE, fonts: OG_FONTS });
}

function missing(): ImageResponse {
    return new ImageResponse(<OgPageCard {...notFoundCard()} domain={DOCS.label} />, {
        ...OG_SIZE,
        fonts: OG_FONTS,
        status: 404
    });
}

export async function generateStaticParams(): Promise<{ path: string[] }[]> {
    return (await docsRoutes()).reduce(
        (params, route) => {
            if (route.isLatest) params.push({ path: CARD.fileSegments(route.segments) });
            return params;
        },
        [{ path: CARD.fileSegments([]) }]
    );
}

export async function GET(_req: Request, { params }: { params: Promise<{ path?: string[] }> }): Promise<Response> {
    const { path = [] } = await params;
    const segments = CARD.pageSegments(path);
    if (segments?.length === 0) return render(rootCard());

    const route = segments && DocsRoute.parse(segments);
    if (!route) return missing();

    if (route.isOverview) {
        const context = await findPackageVersion(route.packageId, route.versionId);
        return context ? render(packageCard(context.entry, context.version)) : missing();
    }

    const resolved = await resolveEntity(route.params).catch(() => null);
    return resolved ? render(entityCard(resolved.entity, resolved.version)) : missing();
}
