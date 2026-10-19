import { newestChange, postDate } from '#lib/blog/post';
import { listedPosts } from '#lib/blog/posts';
import { BLOG_DESCRIPTION, BLOG_NAME, BLOG_PATH, FEED_PATH } from '#lib/blog/seo';
import { canonicalUrl } from '#lib/site';

import type { PostSummary } from '#lib/blog/post';

export const dynamic = 'force-static';
export const revalidate = false;

const XML_ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const escapeXml = (text: string): string => text.replace(/[&<>"']/g, (char) => XML_ENTITIES[char] ?? char);

// RSS 2.0 dates are RFC 822
const rfc822 = (date: string): string => postDate(date).toUTCString();

function item(post: PostSummary): string {
    const url = canonicalUrl(post.url);
    const creators = post.authors.map((author) => `<dc:creator>${escapeXml(author.name)}</dc:creator>`).join('');
    return `<item><title>${escapeXml(post.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${rfc822(post.created)}</pubDate><description>${escapeXml(post.description)}</description>${creators}</item>`;
}

export async function GET(): Promise<Response> {
    const posts = await listedPosts();
    const updated = newestChange(posts);

    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${BLOG_NAME}</title><link>${canonicalUrl(BLOG_PATH)}</link><description>${escapeXml(BLOG_DESCRIPTION)}</description><language>en</language><atom:link href="${canonicalUrl(FEED_PATH)}" rel="self" type="application/rss+xml"/>${updated === undefined ? '' : `<lastBuildDate>${rfc822(updated)}</lastBuildDate>`}${posts.map(item).join('')}</channel></rss>
`;

    return new Response(feed, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
}
