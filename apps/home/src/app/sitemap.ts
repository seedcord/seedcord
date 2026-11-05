import { IS_PRODUCTION } from '@seedcord/ui';

import { lastChanged, newestChange, postDate } from '#lib/blog/summary.ts';
import { listedPosts } from '#lib/blog/posts.ts';
import { BLOG_PATH } from '#lib/blog/paths.ts';
import { canonicalUrl } from '#lib/site.ts';

import type { MetadataRoute } from 'next';

export const revalidate = false;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    if (!IS_PRODUCTION) return [];

    const posts = await listedPosts();
    const newest = newestChange(posts);

    return [
        { url: canonicalUrl('/'), lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
        {
            url: canonicalUrl(BLOG_PATH),
            ...(newest === undefined ? {} : { lastModified: postDate(newest) }),
            changeFrequency: 'weekly',
            priority: 0.8
        },
        ...posts.map((post) => ({
            url: canonicalUrl(post.url),
            lastModified: postDate(lastChanged(post)),
            priority: 0.7
        }))
    ];
}
