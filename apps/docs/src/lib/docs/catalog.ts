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
    isLatest: boolean,
    badge: PackageVersionCatalog['badge']
): PackageVersionCatalog {
    return {
        id: version,
        label: formatVersionLabel(version),
        basePath: buildPackageBasePath(fullName, version),
        isLatest,
        badge,
        channel,
        categories: []
    } satisfies PackageVersionCatalog;
}

// newest first so callers can take versions[0] as the default. categories stay empty until
// loadActiveVersion fills the active one.
function buildVersions(fullName: string, entry: PackageIndexEntry): PackageVersionCatalog[] {
    const versions: PackageVersionCatalog[] = [];

    if (entry.stable) {
        const { latest } = entry.stable;
        for (const version of stableLineHeads(entry.stable)) {
            const isLatest = version === latest;
            versions.push(buildVersion(fullName, version, 'stable', isLatest, isLatest ? 'latest' : null));
        }
    }

    if (entry.prerelease) {
        // 'next' selected by default when no 'latest' release
        versions.push(buildVersion(fullName, entry.prerelease.latest, 'prerelease', !entry.stable, 'next'));
    }

    return versions;
}

function buildPackageEntry(fullName: string, entry: PackageIndexEntry): PackageCatalogEntry {
    const displayName = formatDisplayPackageName(fullName);

    return {
        id: displayName,
        manifestName: fullName,
        label: displayName,
        description: entry.description ?? `Reference documentation for ${displayName}.`,
        versions: buildVersions(fullName, entry)
    } satisfies PackageCatalogEntry;
}

const sortCatalogEntries = (entries: PackageCatalogEntry[]): PackageCatalogEntry[] =>
    entries.sort((a, b) => {
        if (a.manifestName === DEFAULT_MANIFEST_PACKAGE) return -1;
        if (b.manifestName === DEFAULT_MANIFEST_PACKAGE) return 1;
        return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });

// both axes come straight from index.json. nothing fetches project.json here.
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

// react's cache() only memoizes inside a request. a metadata route runs outside one, where every
// getDocsEngine() call returns a fresh engine.
export async function collectCategories(
    engine: VersionedDocsEngine,
    folder: string,
    versionId: string
): Promise<NavigationCategory[]> {
    const entry = await engine.getEntry(folder);
    if (!entry) return [];

    try {
        await engine.setVersion(folder, versionId);
    } catch {
        return [];
    }

    return buildCategories(engine.getPackageDirectory(entry.fullName));
}

// cache() dedupes this across the layout and the page's loaders, so project.json is fetched and the
// model rebuilt once per request
const ensureActiveVersion = cache(async (folder: string, versionId: string): Promise<PackageIndexEntry | null> => {
    const engine = await getDocsEngine();
    const entry = await engine.getEntry(folder);
    if (!entry) return null;

    try {
        await engine.setVersion(folder, versionId);
    } catch {
        return null;
    }

    return entry;
});

export const loadActiveVersion = cache(async (folder: string, versionId: string): Promise<NavigationCategory[]> => {
    const entry = await ensureActiveVersion(folder, versionId);
    if (!entry) return [];

    const engine = await getDocsEngine();
    return buildCategories(engine.getPackageDirectory(entry.fullName));
});

export const loadReadme = cache(async (folder: string, versionId: string): Promise<string | null> => {
    const entry = await ensureActiveVersion(folder, versionId);
    if (!entry) return null;

    const engine = await getDocsEngine();
    return engine.getPackage(entry.fullName)?.manifest.readme ?? null;
});

export const loadChangelogUrl = cache(async (folder: string, versionId: string): Promise<string | null> => {
    const entry = await ensureActiveVersion(folder, versionId);
    if (!entry) return null;

    const engine = await getDocsEngine();
    return engine.getPackage(entry.fullName)?.manifest.changelogUrl ?? null;
});

export interface ReexportLink {
    name: string;
    owner: string;
    href: string;
    tone: EntityTone | null;
}

// the umbrella package re-exports symbols declared in sibling packages. each one resolves to its
// declaring package's page, which is the canonical entity.
export const loadReexports = cache(async (folder: string, versionId: string): Promise<ReexportLink[]> => {
    const entry = await ensureActiveVersion(folder, versionId);
    if (!entry) return [];

    const engine = await getDocsEngine();
    const reexports = engine.getPackage(entry.fullName)?.root.reexports ?? [];
    const resolver = engine.resolver();
    return reexports.reduce<ReexportLink[]>((acc, ref) => {
        // adapter.buildReexports always sets packageName. a missing one would render a blank owner.
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
