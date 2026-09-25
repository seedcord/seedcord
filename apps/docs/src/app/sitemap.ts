import { buildEntityHref, buildPackageBasePath, DEFAULT_VERSION } from '@seedcord/docs-engine';

import { collectCategories, findCatalogVersion, loadDocsCatalog } from '#lib/docs/catalog';
import { getDocsEngine } from '#lib/docs/engine';
import { canonicalUrl } from '#lib/site';

import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const catalog = await loadDocsCatalog();
    const paths = new Set<string>(['/']);
    const engine = await getDocsEngine();

    // setVersion mutates the engine's active version. don't parallelize this loop.
    for (const pkg of catalog) {
        const latest = findCatalogVersion(pkg, DEFAULT_VERSION);
        if (!latest) continue;

        paths.add(buildPackageBasePath(pkg.manifestName, DEFAULT_VERSION));

        // one project.json per version reached 62 fetches and 21 MB, past next's 60s page limit
        const categories = await collectCategories(engine, pkg.id, latest.id);
        for (const category of categories) {
            for (const item of category.items) {
                // a re-export is listed under the package that declares it
                if (!item.href.startsWith(`${latest.basePath}/`)) continue;
                paths.add(
                    buildEntityHref({
                        name: pkg.manifestName,
                        version: DEFAULT_VERSION,
                        slug: item.id,
                        tone: category.tone
                    })
                );
            }
        }
    }

    return Array.from(paths, (path) => ({ url: canonicalUrl(path) }));
}
