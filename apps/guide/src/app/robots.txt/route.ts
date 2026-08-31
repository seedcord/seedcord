import { canonicalUrl } from '#lib/site';

// a MetadataRoute robots file cannot carry the non-standard Content-Signal directive
export const dynamic = 'force-static';

const BODY = `# Content Signals Policy (https://contentsignals.org)
# search: building a search index and providing search results
# ai-input: inputting content into AI models for real-time use
# ai-train: training or fine-tuning AI models

User-agent: *
Content-Signal: search=yes, ai-train=yes, ai-input=yes
Allow: /
Disallow: /dev

Sitemap: ${canonicalUrl('/sitemap.xml')}
`;

export function GET(): Response {
    return new Response(BODY, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
