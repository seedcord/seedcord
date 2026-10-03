import { PackageOverviewTabs } from '#components/docs/PackageOverviewTabs';
import { PackageVersionOverview } from '#components/docs/PackageVersionOverview';
import { ReadmeBlock } from '#components/docs/ReadmeBlock';
import { loadActiveVersion } from '#lib/docs/ActiveVersion';
import { DocsPage } from '#lib/docs/DocsPage';
import { packagePreview } from '#lib/docs/linkPreview';
import { PreviewCard } from '@seedcord/ui/link-preview';
import { ComponentEmbed } from 'discord-component-embed/react';
import { getCatalogContext } from '#lib/docs/pageContext';
import { renderReadme } from '#lib/docs/renderReadme';

import type { PageParams } from '#lib/docs/pageContext';
import type { Metadata } from 'next';
import type { ReactElement } from 'react';

export const dynamic = 'force-static';
export { overviewParams as generateStaticParams } from '#lib/docs/DocsRoute';

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
    const { entry, version } = await getCatalogContext(await params);
    return DocsPage.forPackage(entry, version).metadata();
}

async function PackageOverviewPage({ params }: { params: Promise<PageParams> }): Promise<ReactElement> {
    const { entry, version, versionSegment } = await getCatalogContext(await params);

    const active = await loadActiveVersion(entry.id, versionSegment);
    const readmeMarkdown = active?.readme;
    const readmeHtml = readmeMarkdown ? await renderReadme(readmeMarkdown, active?.folderUrl) : null;

    const categories = active?.categories ?? [];

    return (
        <>
            <ComponentEmbed>
                <PreviewCard
                    {...packagePreview({ entry, version, versionCategories: categories, folderUrl: active?.folderUrl })}
                />
            </ComponentEmbed>
            <PackageOverviewTabs
                title={entry.label}
                version={version.label}
                changelogHref={active?.changelogUrl ?? null}
                readme={readmeHtml ? <ReadmeBlock html={readmeHtml} /> : null}
                reference={<PackageVersionOverview categories={categories} reexports={active?.reexports ?? []} />}
            />
        </>
    );
}

export default PackageOverviewPage;
