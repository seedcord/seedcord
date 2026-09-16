import { assetExtensionOf } from './pageAssets';

// Add a line here whenever a page's slug changes. Nothing detects a rename.
export const RENAMED_PAGES: Record<string, string> = {
    '/throwing': '/replying/throwing',
    '/throwing/faults': '/replying/faults',
    '/throwing/reporting': '/replying/reporting',
    '/throwing/configuring': '/replying/error-behavior',
    '/utilities': '/replying/formatting',
    '/utilities/render-table': '/replying/render-table',
    '/gates': '/checks/gates',
    '/gates/permissions': '/checks/permissions',
    '/gates/your-own': '/checks/your-own',
    '/gates/combining': '/checks/combining',
    '/gates/effect-gates': '/checks/effect-gates',
    '/gates/middleware': '/checks/middleware',
    '/gates/dispatch-context': '/checks/dispatch-context',
    '/gates/cooldown': '/checks/cooldown',
    '/gates/rate-limiter': '/checks/rate-limiter',
    '/gates/in-handler-permissions': '/checks/in-handler-permissions',
    '/gates/changing-roles': '/checks/changing-roles'
};

function withoutTrailingSlash(pathname: string): string {
    return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

/**
 * The route a renamed page moved to, or `undefined` when nothing moved.
 *
 * A page url gets a trailing slash back, since `trailingSlash` in `next.config.ts` makes that the
 * canonical form and a redirect to the bare path would bounce again. A twin or card keeps its
 * extension, because those urls are advertised in the `Link` header and the `og:image` tag.
 */
export function redirectFor(pathname: string): string | undefined {
    const bare = withoutTrailingSlash(pathname);
    const extension = assetExtensionOf(bare);
    const route = extension === undefined ? bare : bare.slice(0, -extension.length);

    const target = RENAMED_PAGES[route];
    if (target === undefined) return undefined;
    return extension === undefined ? `${target}/` : `${target}${extension}`;
}
