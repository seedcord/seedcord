import { OgPageCard } from '@seedcord/ui/OgCard';
import { OG_SIZE } from '@seedcord/ui/og';
import { ImageResponse } from 'next/og';

import { findCatalogEntry, findCatalogVersion, loadDocsCatalog } from '#lib/docs/catalog';
import { entityCard, notFoundCard, packageCard, rootCard } from '#lib/docs/DocsPage';
import { resolveEntity } from '#lib/docs/resolveEntity';
import { OG_FONTS } from '#lib/og/fonts';

import type { DocsCard } from '#lib/docs/DocsPage';

export const dynamic = 'force-static';

const DOMAIN = 'docs.seedcord.org';

function render(card: DocsCard): ImageResponse {
    return new ImageResponse(<OgPageCard {...card} domain={DOMAIN} />, { ...OG_SIZE, fonts: OG_FONTS });
}

function missing(): ImageResponse {
    return new ImageResponse(<OgPageCard {...notFoundCard()} domain={DOMAIN} />, {
        ...OG_SIZE,
        fonts: OG_FONTS,
        status: 404
    });
}

export async function GET(_req: Request, { params }: { params: Promise<{ path?: string[] }> }): Promise<Response> {
    const { path = [] } = await params;

    if (path.length === 0) return render(rootCard());

    const [root, packageId, versionId, ...entitySegments] = path;
    if (root !== 'packages' || !packageId || !versionId) return missing();

    if (entitySegments.length === 0) {
        const catalog = await loadDocsCatalog();
        const entry = findCatalogEntry(catalog, packageId);
        const version = entry ? findCatalogVersion(entry, versionId) : undefined;
        if (!entry || !version) return missing();
        return render(packageCard(entry, version));
    }

    const resolved = await resolveEntity({ packageId, versionId, entitySegments }).catch(() => null);
    if (!resolved) return missing();

    return render(entityCard(resolved.entity, resolved.version));
}
