import { DOCS_URL } from '@seedcord/ui';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? DOCS_URL;
export const SITE_NAME = 'seedcord';
export const OG_SITE_NAME = 'seedcord documentation'; // reads clearer than plain 'seedcord' on docs link embeds
export const SITE_DESCRIPTION =
    'API documentation for seedcord, a TypeScript framework for Discord bots built on discord.js.';
export { GUIDE_URL, HOME_URL, REPO_URL } from '@seedcord/ui';

export function canonicalUrl(path: string): string {
    return new URL(path, SITE_URL).toString();
}

export const OG_IMAGE_W = 1200;
export const OG_IMAGE_H = 630;
