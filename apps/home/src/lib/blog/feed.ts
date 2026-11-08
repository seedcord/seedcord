import { escapeHtml } from '@seedcord/ui/escapeHtml';

import { canonicalUrl } from '#lib/site';

import { BLOG_DESCRIPTION, BLOG_NAME } from './about';
import { BLOG_PATH, FEED_PATH } from './paths';
import { newestChange, postDate } from './summary';

import type { PostSummary } from './summary';

const rfc822 = (date: string): string => postDate(date).toUTCString();

function item(post: PostSummary): string {
    const url = canonicalUrl(post.url);
    const creators = post.authors.map((author) => `<dc:creator>${escapeHtml(author.name)}</dc:creator>`).join('');
    return `<item><title>${escapeHtml(post.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${rfc822(post.created)}</pubDate><description>${escapeHtml(post.description)}</description>${creators}</item>`;
}

export function rssFeed(posts: readonly PostSummary[]): string {
    const updated = newestChange(posts);
    const lastBuild = updated === undefined ? '' : `<lastBuildDate>${rfc822(updated)}</lastBuildDate>`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${BLOG_NAME}</title><link>${canonicalUrl(BLOG_PATH)}</link><description>${escapeHtml(BLOG_DESCRIPTION)}</description><language>en</language><atom:link href="${canonicalUrl(FEED_PATH)}" rel="self" type="application/rss+xml"/>${lastBuild}${posts.map(item).join('')}</channel></rss>
`;
}
