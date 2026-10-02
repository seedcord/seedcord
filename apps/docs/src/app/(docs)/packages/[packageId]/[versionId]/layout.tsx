import { DEFAULT_VERSION } from '@seedcord/docs-engine';
import { cn } from '@seedcord/ui';

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
    const [catalog, { packageId, versionId }] = await Promise.all([loadDocsCatalog(), params]);
    const { entry, version } = await getCatalogContext({ packageId, versionId });

    const categories = (await loadActiveVersion(entry.id, version.id))?.categories ?? [];
    const filled = { ...version, categories };
    const shown = versionId === DEFAULT_VERSION ? servedAtLatest(filled, entry.manifestName) : filled;

    return (
        <Container
            catalog={withVersion(catalog, entry.id, shown)}
            activePackageId={entry.id}
            activeVersionId={version.id}
        >
            <main id="main-content" className={cn('min-w-0')}>
                {children}
            </main>
        </Container>
    );
}

export default PackageLayout;
