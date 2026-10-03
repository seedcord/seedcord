import { DOCS } from '@seedcord/ui/sites';

declare const PAGE_HREF: unique symbol;

// next puts its basePath on <Link> and router paths only. html and plain anchors need this form
export type PageHref = string & { readonly [PAGE_HREF]: true };

export function toPageHref(href: string): PageHref {
    // the brand exists only at compile time
    return (href.startsWith('/') ? `${DOCS.path}${href}` : href) as PageHref;
}
