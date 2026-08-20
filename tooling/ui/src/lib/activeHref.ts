// next's trailingSlash gives usePathname a trailing slash that no href carries
function trimSlash(href: string): string {
    return href.length > 1 && href.endsWith('/') ? href.slice(0, -1) : href;
}

export function isActiveHref(pathname: string, href: string): boolean {
    return trimSlash(pathname) === trimSlash(href);
}

export function matchActiveHref(pathname: string, hrefs: readonly string[]): string | undefined {
    const path = trimSlash(pathname);

    return hrefs.reduce<string | undefined>((longest, href) => {
        const candidate = trimSlash(href);
        const covers = path === candidate || path.startsWith(candidate === '/' ? '/' : `${candidate}/`);
        if (!covers) return longest;
        return longest !== undefined && longest.length >= candidate.length ? longest : candidate;
    }, undefined);
}
