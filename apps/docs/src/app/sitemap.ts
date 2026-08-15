import { DEFAULT_VERSION } from '@seedcord/docs-engine';

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
        for (const version of pkg.versions) {
            paths.add(`/packages/${pkg.id}/${version.id}`);
        }

        // only the latest versions because one project.json per version
        // reached 62 fetches and 21 MBpast next's 60s page limit
        const latest = findCatalogVersion(pkg, DEFAULT_VERSION);
        if (!latest) continue;

        const categories = await collectCategories(engine, pkg.id, latest.id);
        for (const category of categories) {
            for (const item of category.items) {
                paths.add(item.href);
            }
        }
    }

    return Array.from(paths, (path) => ({ url: canonicalUrl(path) }));
}
