import { cn, tw } from '@seedcord/ui';
import Link from 'next/link';

import { loadDocsCatalog } from '#lib/docs/catalog';
import { pageMetadata, SITE_DESCRIPTION } from '#lib/site';
import { getToneConfig, getToneTitle, TONE_ORDER } from '#lib/tonePresentation';

import type { PackageCatalogEntry } from '#lib/docs/types';
import type { EntityTone } from '@seedcord/docs-engine/client';
import type { Metadata } from 'next';
import type { ReactElement } from 'react';

export const metadata: Metadata = pageMetadata({
    title: 'seedcord reference',
    description: SITE_DESCRIPTION,
    path: '/',
    image: '/og'
});

// the publish pipeline rewrites index.json between builds
export const revalidate = 300; // 5 mins

const TRANSPORT_PACKAGES = new Set(['@seedcord/gateway', '@seedcord/http']);

// matches the entity chips on a package's reference tab
const cardClassName = tw`shadow-soft border-border flex flex-col gap-3 rounded-md border bg-(--surface-moderate) p-4 transition`;

interface PackageCard {
    entry: PackageCatalogEntry;
    href: string;
    version: string;
}

function toCard(entry: PackageCatalogEntry): PackageCard {
    const latest = entry.versions.find((version) => version.isLatest) ?? entry.versions[0];
    return { entry, href: latest?.basePath ?? '/', version: latest?.label ?? '' };
}

function tonesOf(card: PackageCard): EntityTone[] {
    return TONE_ORDER.filter((tone) => (card.entry.symbolCounts.get(tone) ?? 0) > 0);
}

function ToneCounts({ card }: { card: PackageCard }): ReactElement {
    return (
        <div className={cn('mt-auto flex flex-wrap items-center gap-1.5')}>
            {tonesOf(card).map((tone) => {
                const { icon: ToneIcon, styles } = getToneConfig(tone);
                return (
                    <span
                        key={tone}
                        className={cn(
                            'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-mono text-xs',
                            styles.badge
                        )}
                    >
                        <ToneIcon size={12} strokeWidth={2} aria-hidden />
                        <span className={cn('sr-only')}>{getToneTitle(tone)}: </span>
                        {card.entry.symbolCounts.get(tone)}
                    </span>
                );
            })}
        </div>
    );
}

// the divider between segments is the page ground colour
function ToneBar({ card }: { card: PackageCard }): ReactElement | null {
    const tones = tonesOf(card);
    const total = tones.reduce((sum, tone) => sum + (card.entry.symbolCounts.get(tone) ?? 0), 0);
    if (total === 0) return null;

    return (
        <div className={cn('flex h-1.5 w-full overflow-hidden rounded-full bg-(--surface-subtle)')}>
            {tones.map((tone, index) => (
                <span
                    key={tone}
                    aria-hidden
                    className={cn(
                        'h-full',
                        getToneConfig(tone).styles.dot,
                        index < tones.length - 1 && 'border-r border-(--color-bg)'
                    )}
                    style={{ width: `${((card.entry.symbolCounts.get(tone) ?? 0) / total) * 100}%` }}
                />
            ))}
        </div>
    );
}

function PackageCardLink({ card, bar = false }: { card: PackageCard; bar?: boolean }): ReactElement {
    return (
        <Link href={card.href} className={cn(cardClassName, 'hover:border-(--border-accent-b-subtle)')}>
            <div className={cn('space-y-1')}>
                <div className={cn('flex items-baseline justify-between gap-3')}>
                    <span className={cn('font-mono text-sm font-medium wrap-break-word text-(--text)')}>
                        {card.entry.manifestName}
                    </span>
                    <span className={cn('shrink-0 font-mono text-xs text-(--text-muted)')}>{card.version}</span>
                </div>
                <p className={cn('text-subtle text-sm')}>{card.entry.description}</p>
            </div>
            <ToneCounts card={card} />
            {bar ? <ToneBar card={card} /> : null}
        </Link>
    );
}

function Section({
    title,
    cards,
    columns,
    bar = false
}: {
    title: string;
    cards: PackageCard[];
    columns: string;
    bar?: boolean;
}): ReactElement {
    return (
        <section className={cn('space-y-3')}>
            <header className={cn('flex items-center gap-2')}>
                <span className={cn('text-subtle text-sm font-semibold tracking-wide uppercase')}>{title}</span>
                <span className={cn('text-xs text-(--text-faint)')}>
                    {cards.length} package{cards.length === 1 ? '' : 's'}
                </span>
            </header>
            <div className={cn('grid gap-3', columns)}>
                {cards.map((card) => (
                    <PackageCardLink key={card.entry.manifestName} card={card} bar={bar} />
                ))}
            </div>
        </section>
    );
}

const WORKSPACE_TITLES: Record<string, string> = {
    cli: 'CLI',
    packages: 'Packages',
    plugins: 'Plugins',
    tooling: 'Tooling'
};

const WORKSPACE_ORDER = Object.keys(WORKSPACE_TITLES);

function workspaceRank(workspace: string): number {
    const index = WORKSPACE_ORDER.indexOf(workspace);
    return index === -1 ? WORKSPACE_ORDER.length : index;
}

function groupByWorkspace(cards: PackageCard[]): [string, PackageCard[]][] {
    const groups = new Map<string, PackageCard[]>();
    for (const card of cards) {
        const key = card.entry.workspace ?? 'packages';
        groups.set(key, [...(groups.get(key) ?? []), card]);
    }

    return [...groups.entries()].sort(([a], [b]) => workspaceRank(a) - workspaceRank(b));
}

export default async function DocsIndexPage(): Promise<ReactElement> {
    const cards = (await loadDocsCatalog()).map(toCard);
    const transports = cards.filter((card) => TRANSPORT_PACKAGES.has(card.entry.manifestName));
    const rest = cards.filter((card) => !TRANSPORT_PACKAGES.has(card.entry.manifestName));

    return (
        <main className={cn('mx-auto w-full max-w-6xl space-y-8 px-5 py-10 sm:px-6 sm:py-14')}>
            <div className={cn('space-y-1')}>
                <p className={cn('text-subtle text-xs font-semibold tracking-[0.35em] uppercase')}>Docs</p>
                <h1 className={cn('font-display text-2xl font-semibold text-(--text)')}>Reference</h1>
            </div>

            <Section title="Transports" cards={transports} columns="sm:grid-cols-2" bar />
            {groupByWorkspace(rest).map(([workspace, group]) => (
                <Section
                    key={workspace}
                    title={WORKSPACE_TITLES[workspace] ?? workspace}
                    cards={group}
                    columns="sm:grid-cols-2 lg:grid-cols-3"
                />
            ))}
        </main>
    );
}
