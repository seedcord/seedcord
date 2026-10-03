import { DOCS, DOCS_URL as DOCS_PRODUCTION, GUIDE } from '@seedcord/ui';
import { ogPageCardAlt } from '@seedcord/ui/OgCard';
import { CARD, TWIN } from '@seedcord/ui/page-asset';

import type { Metadata, MetadataRoute } from 'next';

export const SITE_URL = GUIDE.url;
export const SITE_NAME = 'seedcord guide';
export const SITE_DESCRIPTION = 'The guide to building Discord bots with seedcord.';
export { HOME_URL, REPO_URL } from '@seedcord/ui';

// run the docs app on 3001 next to the guide to check docs links in dev mode
const DOCS_FALLBACK = process.env.NODE_ENV === 'development' ? `http://localhost:3001${DOCS.path}` : DOCS_PRODUCTION;

export const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL ?? DOCS_FALLBACK;

const OG_IMAGE_W = 1200;
const OG_IMAGE_H = 630;

// /tooling redirects to /tooling/ under trailingSlash
export function canonicalUrl(path: string): string {
    const suffixAt = path.search(/[?#]/);
    const [route, suffix] = suffixAt === -1 ? [path, ''] : [path.slice(0, suffixAt), path.slice(suffixAt)];
    const hasExtension = /\.[a-z0-9]+$/i.test(route);
    const slashed = route.endsWith('/') || hasExtension ? route : `${route}/`;
    return GUIDE.at(`${slashed}${suffix}`);
}

function ogImageUrl(path: string): string {
    return canonicalUrl(CARD.publicPath(path));
}

export interface SitemapPage {
    url: string;
    path: string;
    data: { lastModified?: Date | undefined };
}

const ROOT_PRIORITY = 1;
const TAB_PRIORITY = 0.8;
const PAGE_PRIORITY = 0.6;

function priorityOf(filePath: string): number {
    if (filePath === 'index.mdx') return ROOT_PRIORITY;
    return filePath.endsWith('/index.mdx') || !filePath.includes('/') ? TAB_PRIORITY : PAGE_PRIORITY;
}

export function sitemapEntries(pages: readonly SitemapPage[]): MetadataRoute.Sitemap {
    return pages.map(({ url, path, data }) => ({
        url: canonicalUrl(url),
        ...(data.lastModified ? { lastModified: data.lastModified } : {}),
        changeFrequency: 'weekly' as const,
        priority: priorityOf(path)
    }));
}

export interface PageMetadataOptions {
    title: string;
    description?: string | undefined;
    path: string;
    /** The pill the og route draws on this page's card. */
    pill: string;
}

export function pageMetadata({ title, description, path, pill }: PageMetadataOptions): Metadata {
    const url = canonicalUrl(path);
    const summary = description ?? SITE_DESCRIPTION;
    const alt = ogPageCardAlt({ pill, name: title, meta: [] });
    const images = [{ url: ogImageUrl(path), width: OG_IMAGE_W, height: OG_IMAGE_H, alt }];
    const isHome = path === '/';
    // the root's frontmatter title is its sidebar label, "Start here"
    const shownTitle = isHome ? SITE_NAME : title;

    return {
        title: isHome ? { absolute: SITE_NAME } : title,
        description: summary,
        alternates: { canonical: url, types: { 'text/markdown': canonicalUrl(TWIN.publicPath(path)) } },
        openGraph: { type: 'article', siteName: SITE_NAME, url, title: shownTitle, description: summary, images },
        twitter: { card: 'summary_large_image', title: shownTitle, description: summary, images }
    };
}
