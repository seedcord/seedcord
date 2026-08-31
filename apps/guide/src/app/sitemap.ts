import { sitemapEntries } from '#lib/site';
import { source } from '#lib/source';

import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
    return sitemapEntries(source.getPages());
}
