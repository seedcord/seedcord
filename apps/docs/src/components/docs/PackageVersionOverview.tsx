import { cn, tw } from '@seedcord/ui';
import Link from 'next/link';

import { getToneConfig } from '#lib/tonePresentation';

import type { ReexportLink } from '#lib/docs/catalog';
import type { NavigationCategory } from '#lib/docs/types';
import type { ReactElement } from 'react';

const chipBaseClassName = tw`bg-surface-moderate shadow-soft border-border inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-(--text) transition focus-visible:outline-2 focus-visible:outline-offset-2`;

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
            <header className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-1')}>
                <span className={cn('text-subtle text-sm font-semibold tracking-wide uppercase')}>
                    Re-exported from {owner}
                </span>
                <span className={cn('shrink-0 text-xs text-(--text-faint)')}>
                    {links.length} symbol{links.length === 1 ? '' : 's'}
                </span>
            </header>
            <div className={cn('flex flex-wrap gap-2')}>
                {links.map((link) => {
                    const toneStyles = link.tone ? getToneConfig(link.tone).styles : null;
                    // re-exports open the owning package's page in a new tab, matching the cross-package link convention
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
