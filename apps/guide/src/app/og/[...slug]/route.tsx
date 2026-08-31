import { OgPageCard } from '@seedcord/ui/OgCard';
import { loadOgFonts, OG_SIZE } from '@seedcord/ui/og';
import { BRAND } from '@seedcord/ui/palette';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';

import { tabPillFor } from '#lib/og/card';
import { assetSegments, CARD, slugsFromAsset } from '#lib/pageAssets';
import { SITE_DESCRIPTION } from '#lib/site';
import { source } from '#lib/source';

export const dynamic = 'force-static';

const DOMAIN = 'guide.seedcord.org';

const SITE_PILL = 'guide';

export function generateStaticParams(): { slug: string[] }[] {
    return source.getPages().map((page) => ({ slug: assetSegments(page.slugs, CARD) }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }): Promise<Response> {
    const { slug } = await params;
    // getPage defaults an undefined slug list to the root page
    const slugs = slugsFromAsset(slug, CARD);
    const page = slugs === undefined ? undefined : source.getPage(slugs);
    if (!page) notFound();

    return new ImageResponse(
        <OgPageCard
            pill={page.slugs.length === 0 ? SITE_PILL : tabPillFor(page.path)}
            accent={BRAND.seedDark}
            meta={[]}
            name={page.data.title}
            description={page.data.description ?? SITE_DESCRIPTION}
            domain={DOMAIN}
        />,
        { ...OG_SIZE, fonts: loadOgFonts() }
    );
}
