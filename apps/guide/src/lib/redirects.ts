// Add a line here whenever a page's slug changes. Nothing detects a rename.
export const RENAMED_PAGES: Record<string, string> = {
    '/throwing': '/replying/throwing',
    '/throwing/faults': '/replying/faults',
    '/throwing/reporting': '/replying/reporting',
    '/throwing/configuring': '/replying/error-behavior',
    '/utilities': '/replying/formatting',
    '/utilities/render-table': '/replying/render-table'
};

function withoutTrailingSlash(pathname: string): string {
    return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/**
 * The route a renamed page moved to, or `undefined` when nothing moved.
 *
 * The returned path carries a trailing slash, since `trailingSlash` in `next.config.ts` makes that
 * the canonical form and a redirect to the bare path would bounce again.
 */
export function redirectFor(pathname: string): string | undefined {
    const target = RENAMED_PAGES[withoutTrailingSlash(pathname)];
    return target === undefined ? undefined : `${target}/`;
}
