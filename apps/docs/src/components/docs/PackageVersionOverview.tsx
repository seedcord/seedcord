import { cn, tw } from '@seedcord/ui';
import Link from 'next/link';

import { getToneConfig, getToneTitle, TONE_ORDER } from '#lib/tonePresentation';

import type { ReexportLink } from '#lib/docs/catalog';
import type { NavigationCategory } from '#lib/docs/types';
import type { EntityTone } from '@seedcord/docs-engine/client';
import type { ReactElement } from 'react';

const chipClassName = tw`bg-surface-moderate shadow-soft border-border inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-(--text) transition focus-visible:outline-2 focus-visible:outline-offset-2`;

const reexportChipClassName = tw`bg-surface-moderate shadow-soft border-border inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium text-(--text) transition focus-visible:outline-2 focus-visible:outline-offset-2`;

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
                    <Link key={item.id} href={item.href} className={cn(chipClassName, toneStyles.item)}>
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

// re-exports open the owning package's page in a new tab, matching the cross-package link convention
function renderReexportLink(link: ReexportLink): ReactElement {
    const toneStyles = link.tone ? getToneConfig(link.tone).styles : null;
    return (
        <Link
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(reexportChipClassName, toneStyles?.item)}
        >
            {toneStyles ? <span aria-hidden className={cn('size-1 shrink-0 rounded-full', toneStyles.dot)} /> : null}
            {link.name}
        </Link>
    );
}

function toneRank(tone: EntityTone | null): number {
    return tone ? TONE_ORDER.indexOf(tone) : TONE_ORDER.length;
}

function groupByTone(links: readonly ReexportLink[]): [EntityTone | null, ReexportLink[]][] {
    const groups = new Map<EntityTone | null, ReexportLink[]>();
    for (const link of links) {
        groups.set(link.tone, [...(groups.get(link.tone) ?? []), link]);
    }
    return [...groups.entries()].sort(([a], [b]) => toneRank(a) - toneRank(b));
}

function renderReexportGroup([owner, links]: [string, ReexportLink[]]): ReactElement {
    return (
        <section key={owner} className={cn('space-y-4')}>
            <header className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-1')}>
                <span className={cn('text-subtle text-sm font-semibold tracking-wide uppercase')}>
                    Re-exported from {owner}
                </span>
                <span className={cn('shrink-0 text-xs text-(--text-faint)')}>
                    {links.length} symbol{links.length === 1 ? '' : 's'}
                </span>
            </header>
            {groupByTone(links).map(([tone, toneLinks]) => {
                const config = tone ? getToneConfig(tone) : null;
                const ToneIcon = config?.icon;
                return (
                    <div key={tone ?? 'untoned'} className={cn('space-y-2 pl-1')}>
                        <header className={cn('flex items-center gap-2')}>
                            {ToneIcon ? (
                                <ToneIcon
                                    size={14}
                                    strokeWidth={2}
                                    aria-hidden
                                    className={cn('shrink-0', config?.styles.iconColor)}
                                />
                            ) : null}
                            <span className={cn('text-xs font-semibold tracking-wide text-(--text-muted) uppercase')}>
                                {tone ? getToneTitle(tone) : 'Other'}
                            </span>
                            <span className={cn('text-xs text-(--text-faint)')}>{toneLinks.length}</span>
                        </header>
                        <div className={cn('flex flex-wrap gap-2')}>{toneLinks.map(renderReexportLink)}</div>
                    </div>
                );
            })}
        </section>
    );
}

export function PackageVersionOverview({
    categories,
    reexports
}: {
    categories: readonly NavigationCategory[];
    reexports: readonly ReexportLink[];
}): ReactElement {
    const reexportGroups = groupReexports(reexports);

    if (categories.length === 0 && reexportGroups.length === 0) {
        return <p className={cn('text-subtle text-sm')}>No reference entries are available for this version yet.</p>;
    }

    return (
        <div className={cn('space-y-8')}>
            {categories.map(renderCategory)}
            {reexportGroups.map(renderReexportGroup)}
        </div>
    );
}
