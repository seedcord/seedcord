import { plainSummary } from '@lib/docs/plainSummary';

import type { Metadata } from 'next';

const FALLBACK_URL = 'https://docs.seedcord.org';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_URL;
export const SITE_NAME = 'seedcord';
export const OG_SITE_NAME = 'seedcord documentation'; // reads clearer than plain 'seedcord' on docs link embeds
export const SITE_DESCRIPTION =
    'API documentation for seedcord, a TypeScript framework for Discord bots built on discord.js.';
export const REPO_URL = 'https://github.com/seedcord/seedcord';
export const GUIDE_URL = 'https://guide.seedcord.org';

export function canonicalUrl(path: string): string {
    return new URL(path, SITE_URL).toString();
}

const DESCRIPTION_MAX = 160;
export const OG_IMAGE_W = 1200;
export const OG_IMAGE_H = 630;

function truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

// Next replaces the whole openGraph and twitter block per route, so each page rebuilds it in full here.
// Entity pages pass `image` (their /og route) because a catch-all segment cannot host an opengraph-image file.
export function pageMetadata(opts: {
    title: string;
    description: string;
    path: string;
    type?: 'website' | 'article';
    image?: string;
    // emits <link rel="alternate" type="text/markdown">, the agent-discoverable Markdown mirror of this page
    markdownPath?: string;
}): Metadata {
    const url = canonicalUrl(opts.path);
    // reduced to plain text because social embeds render markdown and newlines literally
    const description = truncate(plainSummary(opts.description), DESCRIPTION_MAX);
    const imageUrl = opts.image ? canonicalUrl(opts.image) : undefined;
    const images = imageUrl ? [{ url: imageUrl, width: OG_IMAGE_W, height: OG_IMAGE_H, alt: opts.title }] : undefined;
    const markdown = opts.markdownPath ? { 'text/markdown': canonicalUrl(opts.markdownPath) } : undefined;
    return {
        title: opts.title,
        description,
        alternates: { canonical: url, ...(markdown ? { types: markdown } : {}) },
        openGraph: {
            type: opts.type ?? 'website',
            siteName: OG_SITE_NAME,
            url,
            title: opts.title,
            description,
            ...(images ? { images } : {})
        },
        twitter: {
            card: 'summary_large_image',
            title: opts.title,
            description,
            ...(imageUrl ? { images: [imageUrl] } : {})
        }
    };
}
