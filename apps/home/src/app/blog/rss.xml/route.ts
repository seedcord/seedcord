import { rssFeed } from '#lib/blog/feed.ts';
import { listedPosts } from '#lib/blog/posts.ts';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET(): Promise<Response> {
    const feed = rssFeed(await listedPosts());
    return new Response(feed, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
}
