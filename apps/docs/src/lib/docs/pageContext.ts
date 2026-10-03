import { notFound } from 'next/navigation';

import { findPackageVersion } from './catalog';

import type { CatalogContext } from './catalog';

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

interface PageContext extends CatalogContext {
    versionSegment: string;
}

export async function getCatalogContext(params: PageParams): Promise<PageContext> {
    const versionSegment = decodeParam(params.versionId);
    const context = await findPackageVersion(decodeParam(params.packageId), versionSegment);
    if (!context) notFound();
    return { ...context, versionSegment };
}
