'use client';
import type { PackageVersionCatalog } from '@lib/docs/types';

export function buildVersionPath(version: PackageVersionCatalog, restSegments: readonly string[]): string {
    if (!restSegments.length) {
        return version.basePath;
    }

    return `${version.basePath}/${restSegments.join('/')}`;
}
