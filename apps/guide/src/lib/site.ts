import { CARD, publicPath, TWIN } from '#lib/pageAssets';

import type { Metadata, MetadataRoute } from 'next';

const FALLBACK_URL = 'https://guide.seedcord.org';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_URL;
export const SITE_NAME = 'seedcord guide';
export const SITE_DESCRIPTION = 'The guide to building Discord bots with seedcord.';
export const HOME_URL = 'https://seedcord.org';

// run the docs app on 3001 next to the guide to check docs links in dev mode
const DOCS_FALLBACK = process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : 'https://docs.seedcord.org';

export const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL ?? DOCS_FALLBACK;
export const REPO_URL = 'https://github.com/seedcord/seedcord';

const OG_IMAGE_W = 1200;
const OG_IMAGE_H = 630;

// /tooling redirects to /tooling/ under trailingSlash
export function canonicalUrl(path: string): string {
    const hasExtension = /\.[a-z0-9]+$/i.test(path);
    const slashed = path.endsWith('/') || hasExtension ? path : `${path}/`;
    return new URL(slashed, SITE_URL).toString();
}

function ogImageUrl(path: string): string {
    return canonicalUrl(publicPath(path, CARD));
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
}

export function pageMetadata({ title, description, path }: PageMetadataOptions): Metadata {
    const url = canonicalUrl(path);
    const summary = description ?? SITE_DESCRIPTION;
    const images = [{ url: ogImageUrl(path), width: OG_IMAGE_W, height: OG_IMAGE_H, alt: title }];

    return {
        title,
        description: summary,
        alternates: { canonical: url, types: { 'text/markdown': canonicalUrl(publicPath(path, TWIN)) } },
        openGraph: { type: 'article', siteName: SITE_NAME, url, title, description: summary, images },
        twitter: { card: 'summary_large_image', title, description: summary, images }
    };
}
