import { cn } from '@seedcord/ui';
import { notFound } from 'next/navigation';

import { Container } from '@components/layout/sidebar/utils/container/Container';
import {
    findCatalogEntry,
    findCatalogVersion,
    loadActiveVersion,
    loadDocsCatalog,
    withActiveCategories
} from '@lib/docs/catalog';

import type { ReactNode } from 'react';

interface PackageLayoutParams {
    packageId: string;
    versionId: string;
}

function decodeParam(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

async function PackageLayout({
    children,
    params
}: {
    children: ReactNode;
    params: Promise<PackageLayoutParams>;
}): Promise<ReactNode> {
    const [catalog, { packageId, versionId }] = await Promise.all([loadDocsCatalog(), params]);

    // 404 gating runs in the layout, not the page: the page renders behind loading.tsx's Suspense
    // boundary, which streams a 200 shell before the page's notFound() could set the status.
    const entry = findCatalogEntry(catalog, decodeParam(packageId));
    if (!entry) notFound();

    const version = findCatalogVersion(entry, decodeParam(versionId));
    if (!version) notFound();

    const catalogForRender = withActiveCategories(
        catalog,
        entry.id,
        version.id,
        await loadActiveVersion(entry.id, version.id)
    );

    return (
        <Container catalog={catalogForRender} activePackageId={entry.id} activeVersionId={version.id}>
            <main id="main-content" className={cn('min-w-0')}>
                {children}
            </main>
        </Container>
    );
}

export default PackageLayout;
