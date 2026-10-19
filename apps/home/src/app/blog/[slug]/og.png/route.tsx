import { SiteAddress } from '@seedcord/ui';
import { OgPageCard } from '@seedcord/ui/OgCard';
import { loadOgFonts, OG_SIZE } from '@seedcord/ui/og';
import { BRAND } from '@seedcord/ui/palette';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'takumi-js/response';

import { slugOf, summarize } from '#lib/blog/post';
import { BLOG_PATH, OG_PILL, ogMeta } from '#lib/blog/seo';
import { blog } from '#lib/blog/source';
import { canonicalUrl } from '#lib/site';

export const dynamic = 'force-static';
export const dynamicParams = false;

interface CardParams {
    params: Promise<{ slug: string }>;
}

export function generateStaticParams(): { slug: string }[] {
    return blog.getPages().map((page) => ({ slug: slugOf(page) }));
}

export async function GET(_request: Request, { params }: CardParams): Promise<ImageResponse> {
    const page = blog.getPage([(await params).slug]);
    if (!page) notFound();

    const post = await summarize(page);
    return new ImageResponse(
        <OgPageCard
            pill={OG_PILL}
            accent={BRAND.seedDark}
            meta={ogMeta(post)}
            name={post.title}
            description={post.description}
            domain={new SiteAddress(canonicalUrl(BLOG_PATH)).label}
        />,
        { ...OG_SIZE, fonts: loadOgFonts() }
    );
}
