'use client';

import { SegmentedControl, cn, type SegmentedControlOption } from '@seedcord/ui';
import { useSyncExternalStore } from 'react';

import type { ReactElement, ReactNode } from 'react';

type OverviewTab = 'readme' | 'reference';

const TAB_STORAGE_KEY = 'docs.overview.tab';

const tabListeners = new Set<() => void>();

function readStoredTab(): OverviewTab | null {
    const stored = window.localStorage.getItem(TAB_STORAGE_KEY);
    return stored === 'readme' || stored === 'reference' ? stored : null;
}

function subscribeStoredTab(callback: () => void): () => void {
    tabListeners.add(callback);
    window.addEventListener('storage', callback);
    return () => {
        tabListeners.delete(callback);
        window.removeEventListener('storage', callback);
    };
}

function writeStoredTab(tab: OverviewTab): void {
    window.localStorage.setItem(TAB_STORAGE_KEY, tab);
    // 'storage' fires only in other tabs, not the one that wrote it.
    tabListeners.forEach((callback) => callback());
}

function resolveTab(stored: OverviewTab | null, hasReadme: boolean): OverviewTab {
    if (stored === 'reference') return 'reference';
    if (stored === 'readme' && hasReadme) return 'readme';
    return hasReadme ? 'readme' : 'reference';
}

interface PackageOverviewTabsProps {
    title: string;
    version: string;
    readme: ReactNode | null;
    reference: ReactNode;
}

export function PackageOverviewTabs({ title, version, readme, reference }: PackageOverviewTabsProps): ReactElement {
    const hasReadme = readme !== null;
    // Server snapshot is null so hydration matches the default render; the stored preference applies after.
    const storedTab = useSyncExternalStore(subscribeStoredTab, readStoredTab, () => null);
    const tab = resolveTab(storedTab, hasReadme);

    const options: SegmentedControlOption<OverviewTab>[] = [
        { value: 'readme', label: 'Overview', disabled: !hasReadme },
        { value: 'reference', label: 'Reference' }
    ];

    return (
        <div className={cn('space-y-6')}>
            <div className={cn('space-y-4')}>
                <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between')}>
                    <div className={cn('min-w-0 space-y-1 text-center lg:text-left')}>
                        <p className={cn('text-subtle text-xs font-semibold tracking-[0.35em] uppercase')}>Package</p>
                        <h1 className={cn('text-2xl font-semibold wrap-break-word text-(--text)')}>
                            {title} <span className={cn('font-normal text-(--text-muted)')}>{version}</span>
                        </h1>
                    </div>
                    {/* Two instances: per-breakpoint full-width can't come from one control (option flex-1 isn't responsive). */}
                    <SegmentedControl
                        options={options}
                        value={tab}
                        onChange={writeStoredTab}
                        size="md"
                        fullWidth
                        aria-label="Package view"
                        className={cn('lg:hidden')}
                    />
                    <SegmentedControl
                        options={options}
                        value={tab}
                        onChange={writeStoredTab}
                        size="md"
                        aria-label="Package view"
                        className={cn('hidden lg:inline-flex')}
                    />
                </div>
                <hr className={cn('border-(--border)')} />
            </div>
            {hasReadme ? <div hidden={tab !== 'readme'}>{readme}</div> : null}
            <div hidden={tab !== 'reference'}>{reference}</div>
        </div>
    );
}
