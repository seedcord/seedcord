import { PRODUCTION_SITES } from '@seedcord/brand';

import type { Tagged } from 'type-fest';

// next puts its basePath on <Link> and router paths only. html and plain anchors need this form
export type PageHref = Tagged<string, 'PageHref'>;

export function toPageHref(href: string): PageHref {
    // the brand exists only at compile time
    return (href.startsWith('/') ? `${PRODUCTION_SITES.docs.path}${href}` : href) as PageHref;
}
