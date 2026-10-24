import type { SearchPackage, SearchViewedPackage } from '#src/types';

export const ALL_PACKAGES = 'all';

interface SearchTarget {
    id: string;
    version: string;
}

export class SearchCatalog {
    constructor(private readonly packages: readonly SearchPackage[]) {}

    get options(): { folder: string; label: string }[] {
        return this.packages.map(({ id, label }) => ({ folder: id, label }));
    }

    get hasPrerelease(): boolean {
        return this.packages.some(({ prerelease }) => prerelease !== null);
    }

    targets(viewed: SearchViewedPackage | null, scope: string, prerelease: boolean): SearchTarget[] {
        return this.packages.reduce<SearchTarget[]>((targets, pkg) => {
            if (scope !== ALL_PACKAGES && pkg.id !== scope) return targets;

            const version = SearchCatalog.versionFor(pkg, viewed, prerelease);
            if (version !== null) targets.push({ id: pkg.id, version });
            return targets;
        }, []);
    }

    private static versionFor(
        pkg: SearchPackage,
        viewed: SearchViewedPackage | null,
        prerelease: boolean
    ): string | null {
        if (pkg.id !== viewed?.pkg) return SearchCatalog.head(pkg, prerelease);
        return viewed.version ?? SearchCatalog.head(pkg, false);
    }

    private static head(pkg: SearchPackage, prerelease: boolean): string | null {
        return prerelease ? (pkg.prerelease ?? pkg.stable) : (pkg.stable ?? pkg.prerelease);
    }
}
