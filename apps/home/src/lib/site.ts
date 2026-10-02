import { HOME_URL, SiteAddress } from '@seedcord/ui';
import { OG_SIZE } from '@seedcord/ui/og';

export { AUTHOR_GITHUB_URL, AUTHOR_URL, DISCORD_URL, DOCS_URL, GUIDE_URL, NPM_ORG_URL, REPO_URL } from '@seedcord/ui';

const SITE = new SiteAddress(process.env.NEXT_PUBLIC_SITE_URL ?? HOME_URL);

export const SITE_URL = SITE.url;
export const SITE_NAME = 'seedcord';
export const SITE_DESCRIPTION =
    'A TypeScript framework for Discord bots, typed end to end, with generated slash-option types, typed customIds, reusable checks, hot reload, and a lot more.';
export const NPM_URL = 'https://www.npmjs.com/package/seedcord';
export const ROADMAP_URL = 'https://github.com/orgs/seedcord/projects/1';
export const CDN_URL = 'https://cdn.seedcord.org';

export function canonicalUrl(path: string): string {
    return SITE.at(path);
}

export const OG_SCALE = 3;

export const DEFAULT_OG_IMAGE = {
    url: '/og.png',
    width: OG_SIZE.width * OG_SCALE,
    height: OG_SIZE.height * OG_SCALE,
    alt: 'A seedcord card. The materwelon mark sits above the headline The whole Discord bot, typed end to end, with pnpm create seedcord in the footer'
};
