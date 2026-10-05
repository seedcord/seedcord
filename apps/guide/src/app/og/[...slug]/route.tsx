import { GUIDE } from '@seedcord/ui';
import { OgPageCard } from '@seedcord/ui/OgCard';
import { loadOgFonts, OG_SIZE } from '@seedcord/ui/og';
import { CARD } from '@seedcord/ui/PageAsset';
import { BRAND } from '@seedcord/ui/palette';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'takumi-js/response';

import { pillFor } from '#lib/og/card';
import { SITE_DESCRIPTION } from '#lib/site';
import { source } from '#lib/source';

export const dynamic = 'force-static';

export function generateStaticParams(): { slug: string[] }[] {
    return source.getPages().map((page) => ({ slug: CARD.fileSegments(page.slugs) }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }): Promise<Response> {
    const { slug } = await params;
    // getPage defaults an undefined slug list to the root page
    const slugs = CARD.pageSegments(slug);
    const page = slugs === undefined ? undefined : source.getPage(slugs);
    if (!page) notFound();

    return new ImageResponse(
        <OgPageCard
            pill={pillFor(page)}
            accent={BRAND.seedDark}
            meta={[]}
            name={page.data.title}
            description={page.data.description ?? SITE_DESCRIPTION}
            domain={GUIDE.label}
        />,
        { ...OG_SIZE, fonts: loadOgFonts() }
    );
}
