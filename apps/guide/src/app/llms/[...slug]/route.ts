import { source } from '#lib/source';
import { assetSegments, slugsFromAsset, TWIN } from '#lib/pageAssets';
import { twinDocument } from '#lib/twin';

export const dynamic = 'force-static';

const MARKDOWN = 'text/markdown; charset=utf-8';
const NOT_FOUND = 404;

export function generateStaticParams(): { slug: string[] }[] {
    return source.getPages().map((page) => ({ slug: assetSegments(page.slugs, TWIN) }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string[] }> }): Promise<Response> {
    const { slug } = await params;
    const slugs = slugsFromAsset(slug, TWIN);
    const page = slugs === undefined ? undefined : source.getPage(slugs);

    if (!page) return new Response('Not found\n', { status: NOT_FOUND, headers: { 'content-type': MARKDOWN } });

    const body = await page.data.getText('processed');
    const document = twinDocument({ title: page.data.title, description: page.data.description, body });
    return new Response(document, { headers: { 'content-type': MARKDOWN } });
}
