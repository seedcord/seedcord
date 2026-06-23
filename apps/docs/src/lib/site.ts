import type { Metadata } from 'next';

const FALLBACK_URL = 'https://docs.seedcord.org';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? FALLBACK_URL;
export const SITE_NAME = 'seedcord';
export const SITE_DESCRIPTION =
    'API documentation for seedcord, a TypeScript framework for Discord bots built on discord.js.';
export const REPO_URL = 'https://github.com/seedcord/seedcord';
export const GUIDE_URL = 'https://guide.seedcord.org';

export function canonicalUrl(path: string): string {
    return new URL(path, SITE_URL).toString();
}

const DESCRIPTION_MAX = 160;

function truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

// Next replaces openGraph and twitter per route instead of merging, so each page rebuilds the full block here.
export function pageMetadata(opts: {
    title: string;
    description: string;
    path: string;
    type?: 'website' | 'article';
}): Metadata {
    const url = canonicalUrl(opts.path);
    const description = truncate(opts.description, DESCRIPTION_MAX);
    return {
        title: opts.title,
        description,
        alternates: { canonical: url },
        openGraph: {
            type: opts.type ?? 'website',
            siteName: SITE_NAME,
            url,
            title: opts.title,
            description
        },
        twitter: { card: 'summary_large_image', title: opts.title, description }
    };
}
