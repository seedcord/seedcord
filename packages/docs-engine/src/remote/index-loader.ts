import { IndexFetchError } from '@remote/errors';
import { validateIndex } from '@remote/index-json';
import { projectBaseFromIndexUrl, resolveIndexUrl } from '@src/constants';

import type { IndexJson, PackageIndexEntry } from '@remote/index-json';

export type Fetcher = (url: string) => Promise<Response>;

export interface ResolvedVersion {
    version: string;
    channel: 'stable' | 'prerelease';
}

const defaultFetcher: Fetcher = (url) => globalThis.fetch(url);

export class IndexLoader {
    private cache: IndexJson | null = null;

    constructor(
        private readonly indexUrl: string = resolveIndexUrl(),
        private readonly fetcher: Fetcher = defaultFetcher
    ) {}

    /** `force` re-fetches past the in-memory cache; it does NOT bust the jsDelivr CDN cache. */
    async load(force = false): Promise<IndexJson> {
        if (this.cache && !force) {
            return this.cache;
        }

        const res = await this.fetcher(this.indexUrl);
        if (!res.ok) {
            throw new IndexFetchError(res.status, `index.json fetch failed (${res.status}) at ${this.indexUrl}`);
        }

        this.cache = validateIndex(await res.json());
        return this.cache;
    }

    listPackages(index: IndexJson): { folder: string; fullName: string }[] {
        return Object.entries(index.packages).map(([folder, entry]) => ({ folder, fullName: entry.fullName }));
    }

    getEntry(index: IndexJson, folder: string): PackageIndexEntry | null {
        return index.packages[folder] ?? null;
    }

    /**
     * Resolves a UI selector to a concrete published version. `latest` / `prerelease` map to the
     * channel head; `v1` / `1` to the latest of a major line; `0.2` to the latest of a minor line;
     * a full version passes through only when it is a published line head (stable or the prerelease).
     */
    resolveVersion(entry: PackageIndexEntry, selector: string): ResolvedVersion | null {
        if (selector === 'prerelease' || selector === 'next') {
            return entry.prerelease ? { version: entry.prerelease.latest, channel: 'prerelease' } : null;
        }

        // A concrete prerelease id (the value surfaced in the version dropdown) resolves back to its channel.
        if (entry.prerelease?.latest === selector) {
            return { version: selector, channel: 'prerelease' };
        }

        const { stable } = entry;
        if (!stable) {
            return null;
        }
        if (selector === 'latest') {
            return { version: stable.latest, channel: 'stable' };
        }

        const byMajor = stable.latestByMajor[selector.replace(/^v/, '')];
        if (byMajor) {
            return { version: byMajor, channel: 'stable' };
        }

        const byMinor = stable.latestByMinor[selector];
        if (byMinor) {
            return { version: byMinor, channel: 'stable' };
        }

        return isPublishedHead(stable, selector) ? { version: selector, channel: 'stable' } : null;
    }

    buildProjectUrl(index: IndexJson, folder: string, version: string, channel: 'stable' | 'prerelease'): string {
        const relative = index.pathTemplates[channel].replace('{name}', folder).replace('{version}', version);
        return `${projectBaseFromIndexUrl(this.indexUrl)}/${relative}`;
    }
}

function isPublishedHead(stable: StableChannelLike, version: string): boolean {
    return (
        stable.latest === version ||
        Object.values(stable.latestByMinor).includes(version) ||
        Object.values(stable.latestByMajor).includes(version)
    );
}

type StableChannelLike = NonNullable<PackageIndexEntry['stable']>;
