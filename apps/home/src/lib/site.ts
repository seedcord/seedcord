import { HOME_URL } from '@seedcord/ui';
import { OG_SIZE } from '@seedcord/ui/og';

export { AUTHOR_GITHUB_URL, AUTHOR_URL, DISCORD_URL, NPM_ORG_URL, REPO_URL } from '@seedcord/ui';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? HOME_URL;
export const SITE_NAME = 'seedcord';
export const SITE_DESCRIPTION =
    'A TypeScript framework for Discord bots. Generated slash-option types, a typed customId codec, composable gates, and hot reload, all on top of discord.js.';
export const GUIDE_URL = 'https://guide.seedcord.org';
export const DOCS_URL = 'https://docs.seedcord.org';
export const NPM_URL = 'https://www.npmjs.com/package/seedcord';
export const ROADMAP_URL = 'https://github.com/orgs/seedcord/projects/1';
export const CDN_URL = 'https://cdn.seedcord.org';

export function canonicalUrl(path: string): string {
    return new URL(path, SITE_URL).toString();
}

export const OG_SCALE = 3;

export const DEFAULT_OG_IMAGE = {
    url: '/og/image.png',
    width: OG_SIZE.width * OG_SCALE,
    height: OG_SIZE.height * OG_SCALE,
    alt: 'seedcord, the whole Discord bot, wired and typed'
};
