'use client';

import { Button, SegmentedControl, cn, easeOutStrong, type SegmentedControlOption } from '@seedcord/ui';
import { ExternalLink } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';

import type { Variants } from 'motion/react';
import type { ReactElement, ReactNode } from 'react';

const SLIDE_DURATION = 0.5;
const SLIDE_X = 40;
const BLUR_PX = 5;

const panelVariants: Variants = {
    enter: (dir: number) => ({ x: dir * -SLIDE_X, opacity: 0, filter: `blur(${BLUR_PX}px)` }),
    center: { x: 0, opacity: 1, filter: 'blur(0px)' },
    exit: (dir: number) => ({ x: dir * SLIDE_X, opacity: 0, filter: `blur(${BLUR_PX}px)` })
};

type OverviewTab = 'readme' | 'reference';

const TAB_STORAGE_KEY = 'docs.overview.tab';

const tabListeners = new Set<() => void>();

function readStoredTab(): OverviewTab | null {
    try {
        const stored = window.localStorage.getItem(TAB_STORAGE_KEY);
        return stored === 'readme' || stored === 'reference' ? stored : null;
    } catch {
        return null;
    }
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
    try {
        window.localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
        // storage blocked (private mode / disabled), so the preference just won't persist
    }
    // the 'storage' event fires only in other tabs
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
    changelogHref?: string | null;
    readme: ReactNode | null;
    reference: ReactNode;
}

export function PackageOverviewTabs({
    title,
    version,
    changelogHref,
    readme,
    reference
}: PackageOverviewTabsProps): ReactElement {
    const hasReadme = readme !== null;
    // the server snapshot is null so hydration matches the default render. the stored preference applies after
    const storedTab = useSyncExternalStore(subscribeStoredTab, readStoredTab, () => null);
    const tab = resolveTab(storedTab, hasReadme);

    const [direction, setDirection] = useState(1);
    const handleTabChange = (next: OverviewTab): void => {
        const nextIndex = next === 'readme' ? 0 : 1;
        const currentIndex = tab === 'readme' ? 0 : 1;
        setDirection(nextIndex >= currentIndex ? 1 : -1);
        writeStoredTab(next);
    };

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
                        <h1 className={cn('font-display text-2xl font-semibold wrap-break-word text-(--text)')}>
                            {title} <span className={cn('font-normal text-(--text-muted)')}>{version}</span>
                        </h1>
                    </div>
                    <div className={cn('flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-2')}>
                        {changelogHref ? (
                            <Button asChild variant="ghost" size="md" className={cn('w-full lg:w-auto')}>
                                <Link href={changelogHref} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink size={16} aria-hidden />
                                    Changelog
                                </Link>
                            </Button>
                        ) : null}
                        <SegmentedControl
                            options={options}
                            value={tab}
                            onChange={handleTabChange}
                            size="md"
                            fullWidth
                            aria-label="Package view"
                            className={cn('lg:hidden')}
                        />
                        <SegmentedControl
                            options={options}
                            value={tab}
                            onChange={handleTabChange}
                            size="md"
                            aria-label="Package view"
                            className={cn('hidden lg:inline-flex')}
                        />
                    </div>
                </div>
                <hr className={cn('border-(--border)')} />
            </div>
            <div className={cn('grid items-start overflow-hidden')}>
                <AnimatePresence initial={false} custom={direction}>
                    <m.div
                        key={tab}
                        custom={direction}
                        variants={panelVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: SLIDE_DURATION, ease: [...easeOutStrong] }}
                        className={cn('col-start-1 row-start-1')}
                    >
                        {tab === 'readme' ? readme : reference}
                    </m.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
