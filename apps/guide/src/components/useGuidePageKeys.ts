'use client';

import { clickCopyAnchor } from '@seedcord/ui';

import { GUIDE_KEYS } from '#lib/guideKeys';

import { useSectionCursor } from './useSectionCursor';

import type { GuideTab } from '#lib/nav';
import type { PageNeighbours } from '#lib/neighbours';
import type { Hotkey } from '@seedcord/ui';

export interface PageKeyTargets {
    tabs: readonly GuideTab[];
    activeHref: string;
    neighbours: PageNeighbours;
    headingIds: readonly string[];
}

export function useGuidePageKeys(
    router: { push: (href: string) => void },
    { tabs, activeHref, neighbours, headingIds }: PageKeyTargets,
    inView: string | undefined
): Hotkey[] {
    const cursor = useSectionCursor(headingIds, inView);
    const tabAt = tabs.findIndex((tab) => tab.href === activeHref);
    const tabHref = (by: 1 | -1): string | undefined => (tabAt === -1 ? undefined : tabs[tabAt + by]?.href);
    const go = (href: string | undefined): void => {
        if (href !== undefined) router.push(href);
    };

    return [
        { ...GUIDE_KEYS.previousPage, run: () => go(neighbours.previous?.href) },
        { ...GUIDE_KEYS.nextPage, run: () => go(neighbours.next?.href) },
        { ...GUIDE_KEYS.previousTab, run: () => go(tabHref(-1)) },
        { ...GUIDE_KEYS.nextTab, run: () => go(tabHref(1)) },
        { ...GUIDE_KEYS.nextSection, run: () => cursor.step(1) },
        { ...GUIDE_KEYS.previousSection, run: () => cursor.step(-1) },
        { ...GUIDE_KEYS.pageBottom, run: cursor.toBottom },
        { ...GUIDE_KEYS.pageTop, run: cursor.toTop },
        { ...GUIDE_KEYS.copySection, run: () => clickCopyAnchor(cursor.section()) }
    ];
}
