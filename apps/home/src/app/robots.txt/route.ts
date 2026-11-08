import { PRODUCTION_SITES } from '@seedcord/brand';
import { GUIDE, IS_PRODUCTION } from '@seedcord/ui';

import { canonicalUrl } from '#lib/site';

// not MetadataRoute so it can carry the non-standard Content-Signal directive
export const dynamic = 'force-static';
export const revalidate = false;

const SIGNAL = IS_PRODUCTION ? 'yes' : 'no';
const SITEMAPS = IS_PRODUCTION
    ? `
Sitemap: ${canonicalUrl('/sitemap.xml')}
Sitemap: ${GUIDE.at('sitemap.xml')}
Sitemap: ${PRODUCTION_SITES.docs.at('sitemap.xml')}
`
    : '';

const BODY = `# Content Signals Policy (https://contentsignals.org)
# search: building a search index and providing search results
# ai-input: inputting content into AI models for real-time use
# ai-train: training or fine-tuning AI models

User-agent: *
Content-Signal: search=${SIGNAL}, ai-train=${SIGNAL}, ai-input=${SIGNAL}
Allow: /
Disallow: ${PRODUCTION_SITES.docs.path}/dev
${SITEMAPS}`;

export function GET(): Response {
    return new Response(BODY, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
