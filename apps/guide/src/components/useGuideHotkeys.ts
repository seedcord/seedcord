'use client';

import { clickCopyAnchor, siteHotkeys, useHotkeys } from '@seedcord/ui';
import { useActiveAnchor } from 'fumadocs-core/toc';
import { useRouter } from 'next/navigation';

import { GUIDE_KEYS } from '#lib/guideKeys';

import { SEARCH_LABEL } from './GuideSearch';
import { useSectionCursor } from './useSectionCursor';

import type { GuideTab } from '#lib/nav';
import type { PageNeighbours } from '#lib/neighbours';
import type { Hotkey, SiteHotkeyActions } from '@seedcord/ui';

export interface GuideHotkeyActions extends SiteHotkeyActions {
    go: (href: string) => void;
    stepSection: (by: 1 | -1) => void;
    copySection: () => void;
}

export interface GuidePlace {
    tabs: readonly GuideTab[];
    activeHref: string;
    neighbours: PageNeighbours;
}

export interface GuidePage extends GuidePlace {
    headingIds: readonly string[];
}

export function guideHotkeys(actions: GuideHotkeyActions, { tabs, activeHref, neighbours }: GuidePlace): Hotkey[] {
    const tabAt = tabs.findIndex((tab) => tab.href === activeHref);
    const go = (href: string | undefined): void => {
        if (href !== undefined) actions.go(href);
    };

    return siteHotkeys(SEARCH_LABEL, actions, [
        { ...GUIDE_KEYS.previousPage, run: () => go(neighbours.previous?.href) },
        { ...GUIDE_KEYS.nextPage, run: () => go(neighbours.next?.href) },
        { ...GUIDE_KEYS.previousTab, run: () => go(tabs[tabAt - 1]?.href) },
        { ...GUIDE_KEYS.nextTab, run: () => go(tabs[tabAt + 1]?.href) },
        { ...GUIDE_KEYS.nextSection, run: () => actions.stepSection(1) },
        { ...GUIDE_KEYS.previousSection, run: () => actions.stepSection(-1) },
        { ...GUIDE_KEYS.copySection, run: actions.copySection }
    ]);
}

export function useGuideHotkeys(openers: SiteHotkeyActions, { headingIds, ...place }: GuidePage): readonly Hotkey[] {
    const router = useRouter();
    // fumadocs' AnchorProvider tracks the heading in view
    const cursor = useSectionCursor(headingIds, useActiveAnchor());
    const hotkeys = guideHotkeys(
        {
            ...openers,
            go: (href) => router.push(href),
            stepSection: cursor.step,
            copySection: () => clickCopyAnchor(cursor.section())
        },
        place
    );
    useHotkeys(hotkeys);
    return hotkeys;
}
