import { ORG_ID, SOFTWARE_ID } from '@seedcord/ui';
import { OG_SIZE } from '@seedcord/ui/og';
import { ogPageCardAlt } from '@seedcord/ui/OgCard';

import { canonicalUrl, DEFAULT_OG_IMAGE, SITE_NAME } from '#lib/site';

import { BLOG_DESCRIPTION, BLOG_NAME, BLOG_TITLE } from './about';
import { OG_PILL, ogMeta } from './ogCard';
import { BLOG_PATH, FEED_PATH, ogImagePath, twinPath } from './paths';
import { lastChanged } from './summary';

import type { PostAuthor, PostSummary } from './summary';
import type { Metadata } from 'next';
import type { Blog, Graph, Person, WithContext } from 'schema-dts';

const postId = (post: Pick<PostSummary, 'url'>): string => `${canonicalUrl(post.url)}#post`;

const FEED = { 'application/rss+xml': [{ url: canonicalUrl(FEED_PATH), title: BLOG_NAME }] };

const BLOG_URL = canonicalUrl(BLOG_PATH);
const BLOG_ID = `${BLOG_URL}#blog`;

export const BLOG_METADATA: Metadata = {
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    alternates: { canonical: BLOG_URL, types: FEED },
    openGraph: {
        type: 'website',
        siteName: SITE_NAME,
        url: BLOG_URL,
        title: BLOG_NAME,
        description: BLOG_DESCRIPTION,
        images: [DEFAULT_OG_IMAGE]
    },
    twitter: {
        card: 'summary_large_image',
        title: BLOG_NAME,
        description: BLOG_DESCRIPTION,
        images: [DEFAULT_OG_IMAGE]
    }
};

export function postMetadata(post: PostSummary): Metadata {
    const url = canonicalUrl(post.url);
    const alt = ogPageCardAlt({ pill: OG_PILL, name: post.title, meta: ogMeta(post) });
    const images = [{ url: ogImagePath(post.slug), ...OG_SIZE, alt }];
    const visibility = post.unlisted
        ? { robots: { index: false, follow: false }, types: FEED }
        : { robots: null, types: { ...FEED, 'text/markdown': canonicalUrl(twinPath(post.slug)) } };

    return {
        title: post.title,
        description: post.description,
        robots: visibility.robots,
        authors: post.authors.map(({ name, url: authorUrl }) => ({ name, url: authorUrl })),
        alternates: { canonical: url, types: visibility.types },
        openGraph: {
            type: 'article',
            siteName: SITE_NAME,
            url,
            title: post.title,
            description: post.description,
            publishedTime: post.created,
            modifiedTime: lastChanged(post),
            authors: post.authors.map((author) => author.url),
            images
        },
        twitter: { card: 'summary_large_image', title: post.title, description: post.description, images }
    };
}

function person({ name, url, github }: PostAuthor): Person {
    return { '@type': 'Person', name, url, sameAs: url === github ? [] : [github] };
}

export function postJsonLd(post: PostSummary): Graph {
    const url = canonicalUrl(post.url);
    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'BlogPosting',
                '@id': postId(post),
                headline: post.title,
                description: post.description,
                url,
                mainEntityOfPage: url,
                image: canonicalUrl(ogImagePath(post.slug)),
                datePublished: post.created,
                dateModified: lastChanged(post),
                timeRequired: `PT${post.minutes}M`,
                author: post.authors.map(person),
                publisher: { '@id': ORG_ID },
                about: { '@id': SOFTWARE_ID },
                isPartOf: { '@id': BLOG_ID }
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: SITE_NAME, item: canonicalUrl('/') },
                    { '@type': 'ListItem', position: 2, name: BLOG_TITLE, item: BLOG_URL },
                    { '@type': 'ListItem', position: 3, name: post.title, item: url }
                ]
            }
        ]
    };
}

export function blogJsonLd(posts: readonly PostSummary[]): WithContext<Blog> {
    return {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        '@id': BLOG_ID,
        name: BLOG_NAME,
        description: BLOG_DESCRIPTION,
        url: BLOG_URL,
        publisher: { '@id': ORG_ID },
        blogPost: posts.map((post) => ({
            '@type': 'BlogPosting',
            '@id': postId(post),
            headline: post.title,
            url: canonicalUrl(post.url),
            datePublished: post.created,
            author: post.authors.map(person)
        }))
    };
}
