import { PRODUCTION_SITES } from '@seedcord/brand';
import { PRODUCTION_ORIGIN } from '@seedcord/brand';
import { DISCORD_URL, GUIDE, HOME_URL, isSitePath } from '@seedcord/ui/sites';

const SAME_SITE = new Set([PRODUCTION_ORIGIN, new URL(HOME_URL).origin]);
const OTHER_APPS = [GUIDE.path, PRODUCTION_SITES.docs.path];
const OFF_SITE_REDIRECTS = [DISCORD_URL];

type LinkKind = 'home-page' | 'same-site' | 'external';

const isUnder = (pathname: string, base: string): boolean => pathname === base || pathname.startsWith(`${base}/`);
const isFile = (pathname: string): boolean => /\.[a-z0-9]+$/i.test(pathname);

export function linkKind(href: string): LinkKind {
    if (OFF_SITE_REDIRECTS.includes(href)) return 'external';
    if (isSitePath(href)) {
        const { pathname } = new URL(href, HOME_URL);
        return OTHER_APPS.some((base) => isUnder(pathname, base)) || isFile(pathname) ? 'same-site' : 'home-page';
    }
    return URL.canParse(href) && !SAME_SITE.has(new URL(href).origin) ? 'external' : 'same-site';
}
