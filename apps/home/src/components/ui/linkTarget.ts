import { HOME_URL } from '@seedcord/ui';

import { SITE_URL } from '#lib/site';

// SITE_URL differs from seedcord.org in a preview build
const SAME_SITE = new Set([new URL(HOME_URL).origin, new URL(SITE_URL).origin]);

export const opensInNewTab = (href: string): boolean => URL.canParse(href) && !SAME_SITE.has(new URL(href).origin);

export function linkTarget(href: string): { target?: '_blank'; rel?: string } {
    return opensInNewTab(href) ? { target: '_blank', rel: 'noreferrer' } : {};
}
