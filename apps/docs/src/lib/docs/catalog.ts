import {
    DEFAULT_MANIFEST_PACKAGE,
    DEFAULT_VERSION,
    buildPackageBasePath,
    formatDisplayPackageName,
    formatVersionLabel,
    stableLineHeads
} from '@seedcord/docs-engine';
import { cache } from 'react';

import { getDocsEngine } from './engine';

import type { DocsCatalog, PackageCatalogEntry, PackageVersionCatalog } from './types';
import type { PackageIndexEntry } from '@seedcord/docs-engine';
import type { EntityTone } from '@seedcord/docs-engine/client';

// newest first. the layout fills in categories for the version it renders
function buildVersions(fullName: string, entry: PackageIndexEntry): PackageVersionCatalog[] {
    const version = (
        id: string,
        channel: PackageVersionCatalog['channel'],
        isLatest: boolean,
        badge: PackageVersionCatalog['badge']
    ): PackageVersionCatalog => ({
        id,
        label: formatVersionLabel(id),
        basePath: buildPackageBasePath(fullName, id),
        isLatest,
        badge,
        channel,
        categories: []
    });

    const { stable, prerelease } = entry;
    const stableVersions = stable
        ? stableLineHeads(stable).map((id) => {
              const isLatest = id === stable.latest;
              return version(id, 'stable', isLatest, isLatest ? 'latest' : null);
          })
        : [];

    // a package with only pre-releases serves its newest one at /latest/
    const prereleaseVersions = prerelease ? [version(prerelease.latest, 'prerelease', !stable, 'next')] : [];

    return [...stableVersions, ...prereleaseVersions];
}

function countByTone(entities: PackageIndexEntry['entities']): ReadonlyMap<EntityTone, number> {
    const counts = new Map<EntityTone, number>();
    for (const tone of Object.values(entities ?? {})) {
        counts.set(tone, (counts.get(tone) ?? 0) + 1);
    }
    return counts;
}

function buildPackageEntry(fullName: string, entry: PackageIndexEntry): PackageCatalogEntry {
    const displayName = formatDisplayPackageName(fullName);

    return {
        id: displayName,
        manifestName: fullName,
        label: displayName,
        description: entry.description ?? `Reference documentation for ${displayName}.`,
        workspace: entry.workspace ?? null,
        symbolCounts: countByTone(entry.entities),
        versions: buildVersions(fullName, entry)
    };
}

function byCatalogOrder(a: PackageCatalogEntry, b: PackageCatalogEntry): number {
    if (a.manifestName === DEFAULT_MANIFEST_PACKAGE) return -1;
    if (b.manifestName === DEFAULT_MANIFEST_PACKAGE) return 1;
    return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
}

// DOCS_PACKAGES=core,http shrinks a local export to those packages
function isRendered(packageId: string): boolean {
    const only = process.env.DOCS_PACKAGES?.split(',').map((id) => id.trim());
    return only === undefined || only.includes(packageId);
}

// reads only index.json
export const loadDocsCatalog = cache(async (): Promise<DocsCatalog> => {
    const engine = await getDocsEngine();
    await engine.ready();
    const entries = await Promise.all(
        (await engine.listPackages()).map(async ({ folder, fullName }): Promise<PackageCatalogEntry | null> => {
            if (!isRendered(formatDisplayPackageName(fullName))) return null;
            const entry = await engine.getEntry(folder);
            return entry ? buildPackageEntry(fullName, entry) : null;
        })
    );

    return entries.filter((entry): entry is PackageCatalogEntry => entry !== null).sort(byCatalogOrder);
});

export function findCatalogVersion(entry: PackageCatalogEntry, versionId: string): PackageVersionCatalog | undefined {
    if (versionId === DEFAULT_VERSION) {
        return entry.versions.find((version) => version.isLatest) ?? entry.versions[0];
    }

    return entry.versions.find((version) => version.id === versionId);
}

export interface CatalogContext {
    entry: PackageCatalogEntry;
    version: PackageVersionCatalog;
}

export async function findPackageVersion(packageId: string, versionId: string): Promise<CatalogContext | undefined> {
    const entry = (await loadDocsCatalog()).find((candidate) => candidate.id === packageId);
    const version = entry ? findCatalogVersion(entry, versionId) : undefined;
    return entry && version ? { entry, version } : undefined;
}

// a re-exported item keeps its pinned version because the other package's latest can differ
export function servedAtLatest(version: PackageVersionCatalog, manifestName: string): PackageVersionCatalog {
    const basePath = buildPackageBasePath(manifestName, DEFAULT_VERSION);
    const ownPrefix = `${version.basePath}/`;

    return {
        ...version,
        basePath,
        categories: version.categories.map((category) => ({
            ...category,
            items: category.items.map((item) =>
                item.href.startsWith(ownPrefix)
                    ? { ...item, href: `${basePath}/${item.href.slice(ownPrefix.length)}` }
                    : item
            )
        }))
    };
}

export function withVersion(catalog: DocsCatalog, packageId: string, version: PackageVersionCatalog): DocsCatalog {
    return catalog.map((entry) =>
        entry.id === packageId
            ? { ...entry, versions: entry.versions.map((current) => (current.id === version.id ? version : current)) }
            : entry
    );
}
