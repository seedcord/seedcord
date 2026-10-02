import { DOCS_URL, SiteAddress } from '@seedcord/ui';

const SITE = new SiteAddress(process.env.NEXT_PUBLIC_SITE_URL ?? DOCS_URL);

export const SITE_URL = SITE.url;
export const SITE_NAME = 'seedcord';
export const OG_SITE_NAME = 'seedcord documentation'; // reads clearer than plain 'seedcord' on docs link embeds
export const SITE_DESCRIPTION =
    'API documentation for seedcord, a TypeScript framework for Discord bots, typed end to end.';

// docs urls never end in a slash, the root included
export function canonicalUrl(path: string): string {
    return SITE.at(path.replace(/\/+$/, ''));
}

export const OG_IMAGE_W = 1200;
export const OG_IMAGE_H = 630;
