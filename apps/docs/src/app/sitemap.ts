import { loadActiveVersion, loadDocsCatalog } from '@lib/docs/catalog';
import { canonicalUrl } from '@lib/site';

import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const catalog = await loadDocsCatalog();
    const paths = new Set<string>(['/']);

    // loadActiveVersion calls engine.setVersion, which mutates the active version per package, so
    // versions are walked one at a time. loading two versions of one package in parallel would race
    for (const pkg of catalog) {
        for (const version of pkg.versions) {
            paths.add(`/packages/${pkg.id}/${version.id}`);

            const categories = await loadActiveVersion(pkg.id, version.id);
            for (const category of categories) {
                for (const item of category.items) {
                    paths.add(item.href);
                }
            }
        }
    }

    return Array.from(paths, (path) => ({ url: canonicalUrl(path) }));
}
