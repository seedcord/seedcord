import { DEFAULT_VERSION } from '@seedcord/docs-engine';

import { PageTransition } from '#components/layout/PageTransition';
import { Container } from '#components/layout/sidebar/utils/container/Container';
import { loadActiveVersion } from '#lib/docs/ActiveVersion';
import { loadDocsCatalog, servedAtLatest, withVersion } from '#lib/docs/catalog';
import { getCatalogContext } from '#lib/docs/pageContext';

import type { ReactNode } from 'react';

async function PackageLayout({
    children,
    params
}: {
    children: ReactNode;
    params: Promise<{ packageId: string; versionId: string }>;
}): Promise<ReactNode> {
    const [catalog, route] = await Promise.all([loadDocsCatalog(), params]);
    const { entry, version, versionSegment } = await getCatalogContext(route);

    const categories = (await loadActiveVersion(entry.id, versionSegment))?.categories ?? [];
    const filled = { ...version, categories };
    const shown = versionSegment === DEFAULT_VERSION ? servedAtLatest(filled, entry.manifestName) : filled;

    return (
        <Container
            catalog={withVersion(catalog, entry.id, shown)}
            activePackageId={entry.id}
            activeVersionId={version.id}
        >
            <PageTransition
                order={[shown.basePath, ...shown.categories.flatMap(({ items }) => items.map(({ href }) => href))]}
            >
                {children}
            </PageTransition>
        </Container>
    );
}

export default PackageLayout;
