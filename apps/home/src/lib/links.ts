import { DOCS, GUIDE, HOME_URL, isSitePath } from '@seedcord/ui/sites';

import { SITE_URL } from '#lib/site';

// SITE_URL differs from seedcord.org in a preview build
const SAME_SITE = new Set([new URL(HOME_URL).origin, new URL(SITE_URL).origin]);
const OTHER_APPS = [GUIDE.path, DOCS.path];

type LinkKind = 'home-page' | 'same-site' | 'external';

const isUnder = (pathname: string, base: string): boolean => pathname === base || pathname.startsWith(`${base}/`);
const isFile = (pathname: string): boolean => /\.[a-z0-9]+$/i.test(pathname);

export function linkKind(href: string): LinkKind {
    if (isSitePath(href)) {
        const { pathname } = new URL(href, HOME_URL);
        return OTHER_APPS.some((base) => isUnder(pathname, base)) || isFile(pathname) ? 'same-site' : 'home-page';
    }
    return URL.canParse(href) && !SAME_SITE.has(new URL(href).origin) ? 'external' : 'same-site';
}
