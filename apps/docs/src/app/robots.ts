import { canonicalUrl } from '@lib/site';

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: '*', allow: '/', disallow: '/dev' },
        sitemap: canonicalUrl('/sitemap.xml')
    };
}
