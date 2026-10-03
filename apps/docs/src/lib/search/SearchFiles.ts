import { PACKAGES_URL, searchFileUrl } from './files';
import { SearchCatalog } from './SearchCatalog';
import { SearchResults } from './SearchResults';

import type { SearchIndexEntry, SearchPackage } from './types';
import type { ActiveDocsTarget } from '#components/search/command-palette/activeTarget';

class DownloadCache<Value> {
    private readonly downloads = new Map<string, Promise<Value>>();

    get(url: string, download: (url: string) => Promise<Value>): Promise<Value> {
        const cached = this.downloads.get(url);
        if (cached) return cached;

        const pending = download(url);
        pending.catch(() => this.downloads.delete(url));
        this.downloads.set(url, pending);
        return pending;
    }
}

class SearchFiles {
    private readonly catalogs = new DownloadCache<SearchCatalog>();
    private readonly indexes = new DownloadCache<SearchIndexEntry[]>();

    catalog(): Promise<SearchCatalog> {
        return this.catalogs.get(
            PACKAGES_URL,
            async (url) => new SearchCatalog(await SearchFiles.json<SearchPackage[]>(url))
        );
    }

    async results(viewed: ActiveDocsTarget, scope: string, prerelease: boolean): Promise<SearchResults> {
        const targets = (await this.catalog()).targets(viewed, scope, prerelease);
        const files = await Promise.all(
            targets.map(({ id, version }) =>
                this.indexes
                    .get(searchFileUrl(id, version), (url) => SearchFiles.json<SearchIndexEntry[]>(url))
                    .catch((): SearchIndexEntry[] => [])
            )
        );
        return new SearchResults(files.flat());
    }

    private static async json<Payload>(url: string): Promise<Payload> {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Search index failed to load with status ${response.status}`);
        // the docs build writes these files from the same types
        return (await response.json()) as Payload;
    }
}

export const searchFiles = new SearchFiles();
