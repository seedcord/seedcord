import { cn } from '@seedcord/ui';
import { Suspense } from 'react';

import { MovedEntityNotice } from '#components/docs/MovedEntityNotice';
import { PackageOverviewTabs } from '#components/docs/PackageOverviewTabs';
import { PackageVersionOverview } from '#components/docs/PackageVersionOverview';
import { ReadmeBlock } from '#components/docs/ReadmeBlock';
import { loadActiveVersion, loadChangelogUrl, loadReadme, loadReexports } from '#lib/docs/catalog';
import { getCatalogContext } from '#lib/docs/pageContext';
import { renderReadme } from '#lib/docs/renderReadme';
import { pageMetadata } from '#lib/site';

import type { PageParams } from '#lib/docs/pageContext';
import type { Metadata } from 'next';
import type { ReactElement } from 'react';

export const dynamic = 'force-static';

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
    const { entry, version } = await getCatalogContext(await params);
    return pageMetadata({
        title: `${entry.label} ${version.label}`,
        description: entry.description,
        path: `/packages/${entry.id}/${version.id}`,
        image: `/og/packages/${entry.id}/${version.id}`,
        markdownPath: `/llms/packages/${entry.id}/${version.id}`
    });
}

async function PackageOverviewPage({ params }: { params: Promise<PageParams> }): Promise<ReactElement> {
    const { entry, version } = await getCatalogContext(await params);

    const [categories, reexports, readmeMarkdown, changelogHref] = await Promise.all([
        loadActiveVersion(entry.id, version.id),
        loadReexports(entry.id, version.id),
        loadReadme(entry.id, version.id),
        loadChangelogUrl(entry.id, version.id)
    ]);
    const readmeHtml = readmeMarkdown ? await renderReadme(readmeMarkdown) : null;

    return (
        <div className={cn('space-y-8')}>
            <Suspense fallback={null}>
                <MovedEntityNotice packageLabel={entry.label} />
            </Suspense>
            <PackageOverviewTabs
                title={entry.label}
                version={version.label}
                changelogHref={changelogHref}
                readme={readmeHtml ? <ReadmeBlock html={readmeHtml} /> : null}
                reference={<PackageVersionOverview categories={categories} reexports={reexports} />}
            />
        </div>
    );
}

export default PackageOverviewPage;
