import { notFound } from 'next/navigation';

import { findCatalogEntry, findCatalogVersion, loadDocsCatalog } from './catalog';

import type { PackageCatalogEntry, PackageVersionCatalog } from './types';

export type PageParams = Record<string, string | string[] | undefined>;

function decodeParam(value: string | string[] | undefined): string {
    if (!value) return '';
    const raw = Array.isArray(value) ? value[0] : value;
    const safe = raw ?? '';
    try {
        return decodeURIComponent(safe);
    } catch {
        return safe;
    }
}

export async function getCatalogContext(
    params: PageParams
): Promise<{ entry: PackageCatalogEntry; version: PackageVersionCatalog }> {
    const catalog = await loadDocsCatalog();
    const decodedPackageId = decodeParam(params.packageId);

    if (!decodedPackageId) notFound();

    const entry = findCatalogEntry(catalog, decodedPackageId);
    if (!entry) notFound();

    const version = findCatalogVersion(entry, decodeParam(params.versionId));
    if (!version) notFound();

    return { entry, version };
}
