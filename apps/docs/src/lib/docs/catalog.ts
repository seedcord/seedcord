import {
    DEFAULT_MANIFEST_PACKAGE,
    DEFAULT_VERSION,
    buildEntityHref,
    buildPackageBasePath,
    formatDisplayPackageName,
    formatVersionLabel,
    stableLineHeads
} from '@seedcord/docs-engine';
import { cache } from 'react';

import { getDocsEngine } from './engine';

import type { VersionedDocsEngine } from './engine';
import type {
    CategoryConfig,
    DocsCatalog,
    NavigationCategory,
    NavigationEntityItem,
    PackageCatalogEntry,
    PackageVersionCatalog
} from './types';
import type { PackageIndexEntry } from '@seedcord/docs-engine';
import type { EntityTone } from '@seedcord/docs-engine/client';

type GetPackageDirectoryReturn = ReturnType<VersionedDocsEngine['getPackageDirectory']>;

const CATEGORY_CONFIG: readonly CategoryConfig[] = [
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

function buildCategories(directory: GetPackageDirectoryReturn): NavigationCategory[] {
    if (!directory) {
        return [];
    }

    return CATEGORY_CONFIG.flatMap(({ entity, tone, title }) => {
        const entries = Array.from(directory.entries(entity));
        if (!entries.length) {
            return [];
        }

        const items = entries
            .map(([slug, node]) =>
                createNavigationItem(node.sourcePackage.name, node.sourcePackage.version, slug, node.name, tone)
            )
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
}

function buildVersion(
    fullName: string,
    version: string,
    channel: 'stable' | 'prerelease',
    isLatest: boolean
): PackageVersionCatalog {
    return {
        id: version,
        label: formatVersionLabel(version),
        basePath: buildPackageBasePath(fullName, version),
        isLatest,
        channel,
        categories: []
    } satisfies PackageVersionCatalog;
}

// Newest-first (stable line heads, then latest prerelease) so callers can take versions[0] as the
// default. Categories stay empty here; loadActiveVersion fills them for one version on demand.
function buildVersions(fullName: string, entry: PackageIndexEntry): PackageVersionCatalog[] {
    const versions: PackageVersionCatalog[] = [];

    if (entry.stable) {
        const { latest } = entry.stable;
        for (const version of stableLineHeads(entry.stable)) {
            versions.push(buildVersion(fullName, version, 'stable', version === latest));
        }
    }

    if (entry.prerelease) {
        versions.push(buildVersion(fullName, entry.prerelease.latest, 'prerelease', false));
    }

    return versions;
}

function buildPackageEntry(fullName: string, entry: PackageIndexEntry): PackageCatalogEntry {
    const displayName = formatDisplayPackageName(fullName);

    return {
        id: displayName,
        manifestName: fullName,
        label: displayName,
        description: `Reference documentation for ${displayName}.`,
        versions: buildVersions(fullName, entry)
    } satisfies PackageCatalogEntry;
}

const sortCatalogEntries = (entries: PackageCatalogEntry[]): PackageCatalogEntry[] =>
    entries.sort((a, b) => {
        if (a.manifestName === DEFAULT_MANIFEST_PACKAGE) return -1;
        if (b.manifestName === DEFAULT_MANIFEST_PACKAGE) return 1;
        return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });

// The package + version axes come straight from index.json; no project.json is fetched.
export const loadDocsCatalog = cache(async (): Promise<DocsCatalog> => {
    const engine = await getDocsEngine();
    await engine.ready();
    const packages = await engine.listPackages();

    const entries = await Promise.all(
        packages.map(async ({ folder, fullName }): Promise<PackageCatalogEntry | null> => {
            const entry = await engine.getEntry(folder);
            return entry ? buildPackageEntry(fullName, entry) : null;
        })
    );

    return sortCatalogEntries(entries.filter((entry): entry is PackageCatalogEntry => entry !== null));
});

// Cached so the layout and page share one fetch + setVersion per (folder, version).
export const loadActiveVersion = cache(async (folder: string, versionId: string): Promise<NavigationCategory[]> => {
    const engine = await getDocsEngine();
    const entry = await engine.getEntry(folder);
    if (!entry) {
        return [];
    }

    try {
        await engine.setVersion(folder, versionId);
    } catch {
        return [];
    }

    return buildCategories(engine.getPackageDirectory(entry.fullName));
});

export interface ReexportLink {
    name: string;
    owner: string;
    href: string;
    tone: EntityTone | null;
}

// The umbrella package re-exports symbols declared in sibling packages; resolve each to its declaring
// package's page so the overview href targets the canonical entity instead of a duplicate.
export const loadReexports = cache(async (folder: string, versionId: string): Promise<ReexportLink[]> => {
    const engine = await getDocsEngine();
    const entry = await engine.getEntry(folder);
    if (!entry) return [];

    try {
        await engine.setVersion(folder, versionId);
    } catch {
        return [];
    }

    const reexports = engine.getPackage(entry.fullName)?.root.reexports ?? [];
    const resolver = engine.resolver();
    return reexports.reduce<ReexportLink[]>((acc, ref) => {
        // A re-export reference always carries its declaring package (set in adapter.buildReexports);
        // a missing one is dropped rather than rendered with a blank owner.
        if (!ref.packageName) return acc;
        const href = resolver.href(entry.fullName, ref);
        if (href) acc.push({ name: ref.name, owner: ref.packageName, href, tone: resolver.crossPackageTone(ref) });
        return acc;
    }, []);
});

export const findCatalogEntry = (catalog: DocsCatalog, packageId: string): PackageCatalogEntry | undefined =>
    catalog.find((entry) => entry.id === packageId);

export function findCatalogVersion(entry: PackageCatalogEntry, versionId: string): PackageVersionCatalog | undefined {
    if (versionId === DEFAULT_VERSION) {
        return entry.versions.find((version) => version.isLatest) ?? entry.versions[0];
    }

    return entry.versions.find((version) => version.id === versionId);
}

// Fills categories on the resolved (packageId, versionId) only; the sidebar renders the active
// version alone, so every other version stays empty.
export function withActiveCategories(
    catalog: DocsCatalog,
    packageId: string,
    versionId: string,
    categories: readonly NavigationCategory[]
): DocsCatalog {
    return catalog.map((entry) =>
        entry.id === packageId
            ? {
                  ...entry,
                  versions: entry.versions.map((version) =>
                      version.id === versionId ? { ...version, categories } : version
                  )
              }
            : entry
    );
}
