import { PRODUCTION_ORIGIN, PRODUCTION_SITES, SiteAddress } from '@seedcord/brand';

// a path on the current site, like /blog/. a // url points at another host
export const isSitePath = (url: string): boolean => url.startsWith('/') && !url.startsWith('//');

export const absoluteUrl = (url: string, onSite: (path: string) => string): string =>
    isSitePath(url) ? onSite(url) : url;

const ORIGIN = new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN ?? PRODUCTION_ORIGIN).origin;

export const IS_PRODUCTION = ORIGIN === PRODUCTION_ORIGIN;

export const HOME = new SiteAddress(ORIGIN);
export const GUIDE = new SiteAddress(`${ORIGIN}${PRODUCTION_SITES.guide.path}`);

export const HOME_URL = HOME.url;
export const GUIDE_URL = GUIDE.url;

export const REPO_URL = 'https://github.com/seedcord/seedcord';
export const GITHUB_ORG_URL = 'https://github.com/seedcord';
export const NPM_ORG_URL = 'https://www.npmjs.com/org/seedcord';
export const DISCORD_URL = `${PRODUCTION_ORIGIN}/chat/`;
export const AUTHOR_URL = 'https://materwelon.dev';
export const AUTHOR_GITHUB_URL = 'https://github.com/materwelonDhruv';
