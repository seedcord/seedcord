import { ogPageCardAlt } from '@seedcord/ui/OgCard';
import { BRAND } from '@seedcord/ui/palette';

import { plainSummary } from '#lib/docs/plainSummary';
import { ENTITY_TONE_HEX } from '#lib/entityColors';
import { canonicalUrl, OG_IMAGE_H, OG_IMAGE_W, OG_SITE_NAME, SITE_DESCRIPTION, SITE_NAME } from '#lib/site';

import type { EntityModel, PackageCatalogEntry, PackageVersionCatalog } from '#lib/docs/types';
import type { OgPageCardProps } from '@seedcord/ui/OgCard';
import type { Metadata } from 'next';

/** What the og route draws. The page head reads the same object for its description and alt text. */
export type DocsCard = Omit<OgPageCardProps, 'domain'>;

export function rootCard(): DocsCard {
    return { pill: 'docs', accent: BRAND.seedDark, meta: [], name: 'Reference', description: SITE_DESCRIPTION };
}

export function packageCard(entry: PackageCatalogEntry, version: PackageVersionCatalog): DocsCard {
    return {
        pill: 'package',
        accent: BRAND.seedDark,
        meta: [version.label],
        name: entry.label,
        description: entry.description
    };
}

export function entityCard(entity: EntityModel, version: PackageVersionCatalog): DocsCard {
    const summary = plainSummary(entity.summary[0]?.plain ?? '');
    return {
        pill: entity.kind,
        accent: ENTITY_TONE_HEX[entity.kind].light,
        meta: [entity.displayPackage, version.label],
        name: entity.name,
        description: summary.length > 0 ? summary : `${entity.name}, a ${entity.kind} in ${entity.displayPackage}.`
    };
}

export function notFoundCard(): DocsCard {
    return {
        pill: '404',
        accent: BRAND.seedDark,
        meta: [],
        name: 'Not found',
        description: 'This documentation page does not exist.'
    };
}

const DESCRIPTION_MAX = 160;

function truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

interface PageFacts {
    path: string;
    title: string;
    card: DocsCard;
    image: string;
    markdownPath?: string;
    isArticle?: boolean;
    // `undefined` drops the page from the index
    canonicalPath?: string | undefined;
}

export class DocsPage {
    private constructor(private readonly facts: PageFacts) {}

    get card(): DocsCard {
        return this.facts.card;
    }

    static root(): DocsPage {
        return new DocsPage({
            path: '/',
            title: `${SITE_NAME} reference`,
            card: rootCard(),
            image: '/og',
            canonicalPath: '/'
        });
    }

    static forPackage(entry: PackageCatalogEntry, version: PackageVersionCatalog, latestId: string): DocsPage {
        const path = `/packages/${entry.id}/${version.id}`;
        return new DocsPage({
            path,
            title: `${entry.label} ${version.label}`,
            card: packageCard(entry, version),
            image: `${path}.png`,
            markdownPath: `${path}.md`,
            // every package has a latest overview
            canonicalPath: `/packages/${entry.id}/${latestId}`
        });
    }

    static forEntity(
        path: string,
        entity: EntityModel,
        version: PackageVersionCatalog,
        canonicalPath: string | undefined
    ): DocsPage {
        return new DocsPage({
            path,
            title: entity.name,
            card: entityCard(entity, version),
            image: `${path}.png`,
            markdownPath: `${path}.md`,
            isArticle: true,
            canonicalPath
        });
    }

    // Next replaces the whole openGraph and twitter block per route
    metadata(): Metadata {
        const { path, title, card, image, markdownPath, isArticle, canonicalPath } = this.facts;
        const url = canonicalUrl(canonicalPath ?? path);
        // reduced to plain text because social embeds render markdown and newlines literally
        const description = truncate(plainSummary(card.description), DESCRIPTION_MAX);
        const imageUrl = canonicalUrl(image);
        const images = [{ url: imageUrl, width: OG_IMAGE_W, height: OG_IMAGE_H, alt: ogPageCardAlt(card) }];

        return {
            title,
            description,
            alternates: {
                canonical: url,
                ...(markdownPath ? { types: { 'text/markdown': canonicalUrl(markdownPath) } } : {})
            },
            // google merges a canonical between near-duplicates. a dropped symbol has no page to merge into
            ...(canonicalPath === undefined ? { robots: { index: false, follow: true } } : {}),
            openGraph: {
                type: isArticle ? 'article' : 'website',
                siteName: OG_SITE_NAME,
                url,
                title,
                description,
                images
            },
            twitter: { card: 'summary_large_image', title, description, images: [imageUrl] }
        };
    }
}
