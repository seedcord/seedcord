import { parseEntityPathSegments } from '@seedcord/docs-engine';
import { cn, tw } from '@seedcord/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EntityContent } from '@components/docs/entity/EntityContent';
import {
    findCatalogEntry,
    findCatalogVersion,
    loadActiveVersion,
    loadDocsCatalog,
    loadReexports
} from '@lib/docs/catalog';
import { getDocsEngine } from '@lib/docs/engine';
import { loadEntityModel } from '@lib/docs/loadEntityModel';
import { getToneConfig } from '@lib/tonePresentation';

import type { ReexportLink } from '@lib/docs/catalog';
import type { NavigationCategory, PackageCatalogEntry, PackageVersionCatalog } from '@lib/docs/types';
import type { ReactElement } from 'react';

// Prerendered + cached on first request: these entity pages are shiki-heavy, too slow to render per request.
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

    // An unknown explicit version is a 404, not a fall-through to latest.
    const version = findCatalogVersion(entry, decodeParam(params.versionId));
    if (!version) notFound();

    return { entry, version };
}

const chipBaseClassName = tw`bg-surface-moderate shadow-soft border-border inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-(--text) transition focus-visible:outline-2 focus-visible:outline-offset-2`;

function renderCategory(category: NavigationCategory): ReactElement {
    const { icon: ToneIcon, styles: toneStyles } = getToneConfig(category.tone);

    return (
        <section key={category.id} className={cn('space-y-3')}>
            <header className={cn('flex items-center gap-2')}>
                <ToneIcon size={16} strokeWidth={2} aria-hidden className={cn('shrink-0', toneStyles.iconColor)} />
                <span className={cn('text-subtle text-sm font-semibold tracking-wide uppercase')}>
                    {category.title}
                </span>
                <span className={cn('text-xs text-(--text-faint)')}>
                    {category.items.length} item{category.items.length === 1 ? '' : 's'}
                </span>
            </header>
            <div className={cn('flex flex-wrap gap-2')}>
                {category.items.map((item) => (
                    <Link key={item.id} href={item.href} className={cn(chipBaseClassName, toneStyles.item)}>
                        <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', toneStyles.dot)} />
                        {item.label}
                    </Link>
                ))}
            </div>
        </section>
    );
}

function groupReexports(reexports: readonly ReexportLink[]): [string, ReexportLink[]][] {
    const groups = new Map<string, ReexportLink[]>();
    for (const link of reexports) {
        const list = groups.get(link.owner) ?? [];
        list.push(link);
        groups.set(link.owner, list);
    }
    return [...groups.entries()];
}

function renderReexportGroup([owner, links]: [string, ReexportLink[]]): ReactElement {
    return (
        <section key={owner} className={cn('space-y-3')}>
            <header className={cn('flex items-center gap-2')}>
                <span className={cn('text-subtle text-sm font-semibold tracking-wide uppercase')}>
                    Re-exported from {owner}
                </span>
                <span className={cn('text-xs text-(--text-faint)')}>
                    {links.length} symbol{links.length === 1 ? '' : 's'}
                </span>
            </header>
            <div className={cn('flex flex-wrap gap-2')}>
                {links.map((link) => {
                    const toneStyles = link.tone ? getToneConfig(link.tone).styles : null;
                    // Re-exports point at the owning package's page: open in a new tab, matching the
                    // cross-package link convention.
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(chipBaseClassName, toneStyles?.item)}
                        >
                            {toneStyles ? (
                                <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', toneStyles.dot)} />
                            ) : null}
                            {link.name}
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

function PackageVersionOverview({
    entry,
    version,
    categories,
    reexports
}: {
    entry: PackageCatalogEntry;
    version: PackageVersionCatalog;
    categories: readonly NavigationCategory[];
    reexports: readonly ReexportLink[];
}): ReactElement {
    const reexportGroups = groupReexports(reexports);
    const isEmpty = categories.length === 0 && reexportGroups.length === 0;

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
            <div className={cn('space-y-8')}>
                {isEmpty ? (
                    <p className={cn('text-subtle text-sm')}>
                        No reference entries are available for this version yet.
                    </p>
                ) : (
                    <>
                        {categories.map(renderCategory)}
                        {reexportGroups.map(renderReexportGroup)}
                    </>
                )}
            </div>
        </section>
    );
}

async function PackageEntityPage({ params }: { params: Promise<PageParams> }): Promise<ReactElement> {
    const resolvedParams = await params;
    const { entry, version } = await getCatalogContext(resolvedParams);

    const categories = await loadActiveVersion(entry.id, version.id);

    const rawSegments = resolvedParams.entitySegments;
    function normalizeSegments(raw: typeof rawSegments): string[] | undefined {
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'string') return [raw];
        return undefined;
    }
    const normalizedSegments: string[] | undefined = normalizeSegments(rawSegments);

    if (!normalizedSegments || normalizedSegments.length === 0) {
        const reexports = await loadReexports(entry.id, version.id);
        return <PackageVersionOverview entry={entry} version={version} categories={categories} reexports={reexports} />;
    }

    const parsedSegments = parseEntityPathSegments(normalizedSegments);

    if (!parsedSegments.slug) {
        notFound();
    }

    const engine = await getDocsEngine();
    const entity = await loadEntityModel(engine, entry.manifestName, {
        slug: parsedSegments.slug,
        ...(parsedSegments.tone ? { kind: parsedSegments.tone } : {})
    });

    if (!entity) {
        notFound();
    }

    return <EntityContent model={entity} />;
}

export default PackageEntityPage;
