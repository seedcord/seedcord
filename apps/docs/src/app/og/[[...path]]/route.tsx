import { OG, OG_SIZE } from '@seedcord/ui/og';
import { ImageResponse } from 'next/og';

import { findCatalogEntry, findCatalogVersion, loadDocsCatalog } from '@lib/docs/catalog';
import { plainSummary } from '@lib/docs/plainSummary';
import { resolveEntity } from '@lib/docs/resolveEntity';
import { ENTITY_TONE_HEX } from '@lib/entityColors';
import { DocOgCard } from '@lib/og/card';
import { OG_FONTS } from '@lib/og/fonts';
import { SITE_DESCRIPTION } from '@lib/site';

import type { DocOgCardProps } from '@lib/og/card';

// every og:image points here, the path mirrors the page. `/og` is the root, `/og/packages/<pkg>/<ver>`
// the overview, `/og/packages/<pkg>/<ver>/<category>/<slug>` an entity. anything else returns the 404 card.
export const dynamic = 'force-static';

function render(props: DocOgCardProps): ImageResponse {
    return new ImageResponse(<DocOgCard {...props} />, { ...OG_SIZE, fonts: OG_FONTS });
}

function notFoundCard(): ImageResponse {
    return new ImageResponse(
        <DocOgCard
            pill="404"
            accent={OG.seedDark}
            meta={[]}
            name="Not found"
            description="This documentation page does not exist."
        />,
        { ...OG_SIZE, fonts: OG_FONTS, status: 404 }
    );
}

export async function GET(_req: Request, { params }: { params: Promise<{ path?: string[] }> }): Promise<Response> {
    const { path = [] } = await params;

    if (path.length === 0) {
        return render({ pill: 'docs', accent: OG.seedDark, meta: [], name: 'seedcord', description: SITE_DESCRIPTION });
    }

    const [root, packageId, versionId, ...entitySegments] = path;
    if (root !== 'packages' || !packageId || !versionId) return notFoundCard();

    if (entitySegments.length === 0) {
        const catalog = await loadDocsCatalog();
        const entry = findCatalogEntry(catalog, packageId);
        const version = entry ? findCatalogVersion(entry, versionId) : undefined;
        if (!entry || !version) return notFoundCard();
        return render({
            pill: 'package',
            accent: OG.seedDark,
            meta: [version.label],
            name: entry.label,
            description: entry.description
        });
    }

    const resolved = await resolveEntity({ packageId, versionId, entitySegments }).catch(() => null);
    if (!resolved) return notFoundCard();

    const { entity, version } = resolved;
    const summary = plainSummary(entity.summary[0]?.plain ?? '');
    const description = summary.length > 0 ? summary : `A ${entity.kind} in ${entity.displayPackage}.`;
    return render({
        pill: entity.kind,
        accent: ENTITY_TONE_HEX[entity.kind].light,
        meta: [entity.displayPackage, version.label],
        name: entity.name,
        description
    });
}
