'use client';
import { useMemo } from 'react';

import type { PackageCatalogEntry, PackageVersionCatalog } from '@lib/docs/types';

export function useSidebarSelection(
    catalog: readonly PackageCatalogEntry[],
    activePackageId: string,
    activeVersionId: string
): {
    activePackage: PackageCatalogEntry | null;
    activeVersion: PackageVersionCatalog | null;
    packageOptions: readonly PackageCatalogEntry[];
    versionOptions: readonly PackageVersionCatalog[];
} {
    const activePackage = useMemo(() => {
        if (!catalog.length) {
            return null;
        }

        return catalog.find((entry) => entry.id === activePackageId) ?? catalog[0] ?? null;
    }, [catalog, activePackageId]);

    const activeVersion = useMemo(() => {
        if (!activePackage) {
            return null;
        }

        return (
            activePackage.versions.find((version) => version.id === activeVersionId) ??
            activePackage.versions[0] ??
            null
        );
    }, [activePackage, activeVersionId]);

    return {
        activePackage,
        activeVersion,
        packageOptions: catalog,
        versionOptions: activePackage?.versions ?? []
    };
}
