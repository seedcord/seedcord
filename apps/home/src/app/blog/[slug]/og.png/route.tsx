import { SiteAddress } from '@seedcord/ui';
import { OgPageCard } from '@seedcord/ui/OgCard';
import { loadOgFonts, OG_SIZE } from '@seedcord/ui/og';
import { BRAND } from '@seedcord/ui/palette';
import { ImageResponse } from 'takumi-js/response';

import { BLOG_PATH } from '#lib/blog/paths';
import { OG_PILL, ogMeta } from '#lib/blog/ogCard';
import { postParams, summaryFromParams } from '#lib/blog/posts';
import { canonicalUrl } from '#lib/site';

import type { PostParams } from '#lib/blog/posts';

export const dynamic = 'force-static';
export const dynamicParams = false;
export const generateStaticParams = postParams;

export async function GET(_request: Request, route: PostParams): Promise<ImageResponse> {
    const post = await summaryFromParams(route);
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
