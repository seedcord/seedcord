import { PACKAGES_FILE_NAME, REFERENCE_SEARCH_URL, searchFileUrl } from '#src/files';
import { loadOnce } from '#src/loadOnce';
import { readJson } from '#src/readAsset';
import { ALL_PACKAGES, SearchCatalog } from '#src/SearchCatalog';
import { SearchResults } from '#src/SearchResults';

import type { SearchIndexEntry, SearchPackage, SearchViewedPackage } from '#src/types';

class DownloadCache<Value> {
    private readonly downloads = new Map<string, () => Promise<Value>>();

    get(url: string, download: (url: string) => Promise<Value>): Promise<Value> {
        let once = this.downloads.get(url);
        if (!once) {
            once = loadOnce(() => download(url));
            this.downloads.set(url, once);
        }
        return once();
    }
}

export class ReferenceSearch {
    private readonly catalogs = new DownloadCache<SearchCatalog>();
    private readonly indexes = new DownloadCache<SearchIndexEntry[]>();

    constructor(private readonly endpoint = REFERENCE_SEARCH_URL) {}

    catalog(): Promise<SearchCatalog> {
        return this.catalogs.get(
            `${this.endpoint}/${PACKAGES_FILE_NAME}`,
            async (url) => new SearchCatalog(await readJson<SearchPackage[]>(url))
        );
    }

    async results(
        viewed: SearchViewedPackage | null = null,
        scope = ALL_PACKAGES,
        prerelease = false
    ): Promise<SearchResults> {
        const catalog = await this.catalog();
        const targets = catalog.targets(viewed, scope, prerelease);
        const files = await Promise.all(
            targets.map(({ id, version }) =>
                this.indexes
                    .get(searchFileUrl(id, version, this.endpoint), (url) => readJson<SearchIndexEntry[]>(url))
                    .catch((): SearchIndexEntry[] => [])
            )
        );
        return new SearchResults(files.flat());
    }
}
