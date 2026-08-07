import { findCatalogEntry, findCatalogVersion, loadDocsCatalog } from '@lib/docs/catalog';
import { entityToMarkdown } from '@lib/docs/entityMarkdown';
import { resolveEntity } from '@lib/docs/resolveEntity';
import { canonicalUrl } from '@lib/site';

// the llms path mirrors the docs page path, `/llms/packages/<pkg>/<ver>/<category>/<slug>`
export const dynamic = 'force-static';

const MARKDOWN = { 'content-type': 'text/markdown; charset=utf-8' } as const;

function notFound(): Response {
    return new Response('# Not found\n\nThis documentation page does not exist.\n', { status: 404, headers: MARKDOWN });
}

export async function GET(_req: Request, { params }: { params: Promise<{ path?: string[] }> }): Promise<Response> {
    const { path = [] } = await params;
    const [root, packageId, versionId, ...entitySegments] = path;
    if (root !== 'packages' || !packageId || !versionId) return notFound();

    if (entitySegments.length === 0) {
        const catalog = await loadDocsCatalog();
        const entry = findCatalogEntry(catalog, packageId);
        const version = entry ? findCatalogVersion(entry, versionId) : undefined;
        if (!entry || !version) return notFound();
        const url = canonicalUrl(`/packages/${entry.id}/${version.id}`);
        const body = `# ${entry.label}\n\n\`package\` · ${version.label}\n\n<${url}>\n\n${entry.description}\n`;
        return new Response(body, { headers: MARKDOWN });
    }

    const resolved = await resolveEntity({ packageId, versionId, entitySegments }).catch(() => null);
    if (!resolved) return notFound();

    const url = canonicalUrl(`/packages/${resolved.entry.id}/${resolved.version.id}/${entitySegments.join('/')}`);
    return new Response(entityToMarkdown(resolved.entity, url), { headers: MARKDOWN });
}
