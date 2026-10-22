import { DOCS } from '@seedcord/ui';

export const SITE_URL = DOCS.url;
export const SITE_NAME = 'seedcord';
export const OG_SITE_NAME = 'seedcord documentation'; // reads clearer than plain 'seedcord' on docs link embeds
export const SITE_DESCRIPTION =
    'API documentation for seedcord, a TypeScript framework for Discord bots, typed end to end.';

// docs urls never end in a slash, the root included
export function canonicalUrl(path: string): string {
    return DOCS.at(path.replace(/\/+$/, ''));
}

export const OG_IMAGE_W = 1200;
export const OG_IMAGE_H = 630;
