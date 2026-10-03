import { docsRoutes } from '#lib/docs/DocsRoute';
import { canonicalUrl } from '#lib/site';

import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

// a versioned page carries a canonical to its latest url
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    return (await docsRoutes()).reduce<MetadataRoute.Sitemap>(
        (entries, route) => {
            if (route.isLatest) entries.push({ url: canonicalUrl(route.path) });
            return entries;
        },
        [{ url: canonicalUrl('/') }]
    );
}
