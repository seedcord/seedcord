import { DEFAULT_VERSION } from '@seedcord/docs-engine/client';

import { ALL_PACKAGES } from '#components/search/command-palette/constants';

import type { SearchPackage } from './types';
import type { ActiveDocsTarget } from '#components/search/command-palette/activeTarget';
import type { DocsPackageOption } from '#components/search/command-palette/types';

interface SearchTarget {
    id: string;
    version: string;
}

export class SearchCatalog {
    constructor(private readonly packages: readonly SearchPackage[]) {}

    get options(): DocsPackageOption[] {
        return this.packages.map(({ id, label }) => ({ folder: id, label }));
    }

    get hasPrerelease(): boolean {
        return this.packages.some(({ prerelease }) => prerelease !== null);
    }

    targets(viewed: ActiveDocsTarget, scope: string, prerelease: boolean): SearchTarget[] {
        return this.packages.reduce<SearchTarget[]>((targets, pkg) => {
            if (scope !== ALL_PACKAGES && pkg.id !== scope) return targets;

            const version = SearchCatalog.versionFor(pkg, viewed, prerelease);
            if (version !== null) targets.push({ id: pkg.id, version });
            return targets;
        }, []);
    }

    private static versionFor(pkg: SearchPackage, viewed: ActiveDocsTarget, prerelease: boolean): string | null {
        if (pkg.id !== viewed.pkg) return SearchCatalog.head(pkg, prerelease);
        return viewed.version === DEFAULT_VERSION ? SearchCatalog.head(pkg, false) : viewed.version;
    }

    private static head(pkg: SearchPackage, prerelease: boolean): string | null {
        return prerelease ? (pkg.prerelease ?? pkg.stable) : (pkg.stable ?? pkg.prerelease);
    }
}
