import { cache } from 'react';

import { getDocsEngine } from './engine';
import { DEFAULT_MANIFEST_PACKAGE, DEFAULT_VERSION, formatDisplayPackageName } from './packages';
import { buildEntityHref, buildPackageBasePath } from './routes';
import { formatVersionLabel } from './version';

import type { DocsEngine } from './engine';
import type {
    CategoryConfig,
    DocsCatalog,
    NavigationCategory,
    NavigationEntityItem,
    PackageCatalogEntry,
    PackageVersionCatalog
} from './types';
import type { EntityTone } from '@lib/entityMetadata';

type GetPackageDirectoryReturn = ReturnType<DocsEngine['getPackageDirectory']>;

export const CATEGORY_CONFIG: readonly CategoryConfig[] = [
    { entity: 'classes', title: 'Classes', tone: 'class' },
    { entity: 'interfaces', title: 'Interfaces', tone: 'interface' },
    { entity: 'functions', title: 'Functions', tone: 'function' },
    { entity: 'enums', title: 'Enums', tone: 'enum' },
    { entity: 'types', title: 'Types', tone: 'type' },
    { entity: 'variables', title: 'Variables', tone: 'variable' }
] as const;

const createNavigationItem = (
    manifestPackage: string,
    version: string,
    slug: string,
    label: string,
    tone: EntityTone
): NavigationEntityItem => ({
    id: slug,
    label,
    href: buildEntityHref({ name: manifestPackage, version, slug, tone })
});

const buildCategories = (directory: GetPackageDirectoryReturn): NavigationCategory[] => {
    if (!directory) {
        return [];
    }

    return CATEGORY_CONFIG.flatMap(({ entity, tone, title }) => {
        const entries = Array.from(directory.entries(entity));
        if (!entries.length) {
            return [];
        }

        const items = entries
            .map(([slug, node]) => {
                return createNavigationItem(node.sourcePackage.name, node.sourcePackage.version, slug, node.name, tone);
            })
            .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

        if (!items.length) {
            return [];
        }

        return [
            {
                id: entity,
                title,
                tone,
                items
            } satisfies NavigationCategory
        ];
    });
};

const buildPackageEntry = (
    manifestPackage: string,
    version: string,
    directory: GetPackageDirectoryReturn
): PackageCatalogEntry => {
    const displayName = formatDisplayPackageName(manifestPackage);
    const description = `Reference documentation for ${displayName}.`;
    const versionLabel = formatVersionLabel(version);
    const categories = buildCategories(directory);

    const versionCatalog: PackageVersionCatalog = {
        id: version,
        label: versionLabel,
        summary: `${displayName} API (${versionLabel})`,
        manifestVersion: version,
        basePath: buildPackageBasePath(manifestPackage, version),
        categories
    };

    return {
        id: displayName,
        manifestName: manifestPackage,
        label: displayName,
        description,
        versions: [versionCatalog]
    } satisfies PackageCatalogEntry;
};

const sortCatalogEntries = (entries: PackageCatalogEntry[]): PackageCatalogEntry[] =>
    entries.sort((a, b) => {
        if (a.manifestName === DEFAULT_MANIFEST_PACKAGE) return -1;
        if (b.manifestName === DEFAULT_MANIFEST_PACKAGE) return 1;
        return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });

export const loadDocsCatalog = cache(async (): Promise<DocsCatalog> => {
    const engine = await getDocsEngine();
    const packages = engine.listPackages();

    const entries = packages
        .map((manifestPackage) => {
            const pkg = engine.getPackage(manifestPackage);
            if (!pkg) {
                return null;
            }

            const version = pkg.manifest.version;
            const directory = engine.getPackageDirectory(manifestPackage);

            return buildPackageEntry(manifestPackage, version, directory);
        })
        .filter((entry): entry is PackageCatalogEntry => entry !== null);

    return sortCatalogEntries(entries);
});

export const findCatalogEntry = (catalog: DocsCatalog, packageId: string): PackageCatalogEntry | undefined =>
    catalog.find((entry) => entry.id === packageId);

const parseSemver = (v: string): [number, number, number] => {
    const s = v.replace(/^v/, '');
    const parts = s.split('.').map((p) => Number(p.replace(/[^0-9]/g, '')) || 0);
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
};

const compareSemver = (a: string, b: string): number => {
    const [am, an, ap] = parseSemver(a);
    const [bm, bn, bp] = parseSemver(b);
    if (am !== bm) return am - bm;
    if (an !== bn) return an - bn;
    return ap - bp;
};

export const findCatalogVersion = (
    entry: PackageCatalogEntry,
    versionId: string
): PackageVersionCatalog | undefined => {
    if (!entry.versions.length) return undefined;

    if (versionId === DEFAULT_VERSION) {
        return entry.versions.slice().sort((a, b) => compareSemver(b.manifestVersion, a.manifestVersion))[0];
    }

    return entry.versions.find((version) => version.id === versionId);
};
