import { cn } from '@seedcord/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import EntityContent from '@components/docs/entity/EntityContent';
import { findCatalogEntry, findCatalogVersion, loadDocsCatalog } from '@lib/docs/catalog';
import { loadEntityModel } from '@lib/docs/loadEntityModel';
import { parseEntityPathSegments } from '@lib/docs/routes';
import { getToneConfig } from '@lib/entityMetadata';

import type { NavigationCategory, PackageCatalogEntry, PackageVersionCatalog } from '@lib/docs/types';
import type { ReactElement } from 'react';

export const dynamic = 'force-static';

type PageParams = Record<string, string | string[] | undefined>;

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

async function getCatalogContext(
    params: PageParams
): Promise<{ entry: PackageCatalogEntry; version: PackageVersionCatalog }> {
    const catalog = await loadDocsCatalog();
    const decodedPackageId = decodeParam(params.packageId);

    if (!decodedPackageId) notFound();

    const entry = findCatalogEntry(catalog, decodedPackageId);
    if (!entry) notFound();

    const decodedVersionId = decodeParam(params.versionId);
    const versionCandidate = decodedVersionId ? findCatalogVersion(entry, decodedVersionId) : null;
    const version = versionCandidate ?? entry.versions[0] ?? null;
    if (!version) notFound();

    return { entry, version };
}

function renderCategory(category: NavigationCategory): ReactElement {
    const toneStyles = getToneConfig(category.tone).styles;

    return (
        <div key={category.id} className={cn('space-y-3')}>
            <header className={cn('flex items-center justify-between')}>
                <div className={cn('flex flex-col')}>
                    <span className={cn('text-subtle text-xs font-semibold tracking-wide uppercase')}>
                        {category.title}
                    </span>
                    <span className={cn('text-xs text-(--text-accent-b-strong)')}>
                        {category.items.length} item{category.items.length === 1 ? '' : 's'}
                    </span>
                </div>
            </header>
            <ul className={cn('space-y-2')}>
                {category.items.map((item) => (
                    <li key={item.id}>
                        <Link
                            href={item.href}
                            className={cn(
                                'bg-surface-moderate shadow-soft border-border flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium text-(--text) transition hover:border-(--outline-accent-b-moderate) hover:bg-(--surface-accent-b-moderate)'
                            )}
                        >
                            <span>{item.label}</span>
                            <span
                                className={cn(
                                    `inline-flex h-6 min-w-9 items-center justify-center rounded-full border px-2 py-1 text-xs font-semibold ${toneStyles.badge}`
                                )}
                            >
                                {category.tone}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function PackageVersionOverview({
    entry,
    version
}: {
    entry: PackageCatalogEntry;
    version: PackageVersionCatalog;
}): ReactElement {
    return (
        <section className={cn('space-y-8')}>
            <header className={cn('space-y-3')}>
                <p className={cn('text-subtle text-xs font-semibold tracking-[0.35em] uppercase')}>
                    Reference overview
                </p>
                <h1 className={cn('text-3xl font-semibold text-(--text) sm:text-4xl')}>
                    {entry.label} · {version.label}
                </h1>
            </header>
            <div className={cn('grid gap-6 lg:grid-cols-2 xl:grid-cols-3')}>
                {version.categories.length ? (
                    version.categories.map(renderCategory)
                ) : (
                    <p className={cn('text-subtle text-sm')}>
                        No reference entries are available for this version yet.
                    </p>
                )}
            </div>
        </section>
    );
}

async function PackageEntityPage({ params }: { params: Promise<PageParams> }): Promise<ReactElement> {
    const resolvedParams = await params;
    const { entry, version } = await getCatalogContext(resolvedParams);

    const rawSegments = resolvedParams.entitySegments;
    function normalizeSegments(raw: typeof rawSegments): string[] | undefined {
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'string') return [raw];
        return undefined;
    }
    const normalizedSegments: string[] | undefined = normalizeSegments(rawSegments);

    if (!normalizedSegments || normalizedSegments.length === 0) {
        return <PackageVersionOverview entry={entry} version={version} />;
    }

    const parsedSegments = parseEntityPathSegments(normalizedSegments);

    if (!parsedSegments.slug) {
        notFound();
    }

    const entity = await loadEntityModel({
        manifestPackage: entry.manifestName,
        slug: parsedSegments.slug,
        ...(parsedSegments.tone ? { kind: parsedSegments.tone } : {})
    });

    if (!entity) {
        notFound();
    }

    return <EntityContent model={entity} />;
}

export default PackageEntityPage;
