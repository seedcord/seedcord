import { findPackageVersion } from '#lib/docs/catalog';
import { DocsRoute, docsRoutes } from '#lib/docs/DocsRoute';
import { entityToMarkdown } from '#lib/docs/entityMarkdown';
import { TWIN } from '@seedcord/ui/page-asset';
import { resolveEntity } from '#lib/docs/resolveEntity';
import { canonicalUrl } from '#lib/site';

export const dynamic = 'force-static';

const MARKDOWN = { 'content-type': 'text/markdown; charset=utf-8' } as const;

function notFound(): Response {
    return new Response('# Not found\n\nThis documentation page does not exist.\n', { status: 404, headers: MARKDOWN });
}

export async function generateStaticParams(): Promise<{ path: string[] }[]> {
    return (await docsRoutes()).map((route) => ({ path: TWIN.fileSegments(route.segments) }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ path?: string[] }> }): Promise<Response> {
    const { path = [] } = await params;
    const segments = TWIN.pageSegments(path);
    const route = segments && DocsRoute.parse(segments);
    if (!route) return notFound();

    if (route.isOverview) {
        const context = await findPackageVersion(route.packageId, route.versionId);
        if (!context) return notFound();
        const { entry, version } = context;
        const url = canonicalUrl(new DocsRoute(entry.id, version.id).path);
        const body = `# ${entry.label}\n\n\`package\` · ${version.label}\n\n<${url}>\n\n${entry.description}\n`;
        return new Response(body, { headers: MARKDOWN });
    }

    const resolved = await resolveEntity(route.params).catch(() => null);
    if (!resolved) return notFound();

    const url = canonicalUrl(new DocsRoute(resolved.entry.id, resolved.version.id, route.entitySegments).path);
    return new Response(entityToMarkdown(resolved.entity, url), { headers: MARKDOWN });
}
