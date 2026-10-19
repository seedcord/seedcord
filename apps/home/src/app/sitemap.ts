import { lastChanged, newestChange, postDate } from '#lib/blog/summary';
import { listedPosts } from '#lib/blog/posts';
import { BLOG_PATH } from '#lib/blog/paths';
import { canonicalUrl } from '#lib/site';

import type { MetadataRoute } from 'next';

export const revalidate = false;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
