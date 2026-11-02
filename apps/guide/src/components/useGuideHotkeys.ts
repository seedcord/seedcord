'use client';

import { clickCopyAnchor, siteHotkeys, useHotkeys } from '@seedcord/ui';
import { useActiveAnchor } from 'fumadocs-core/toc';
import { useRouter } from 'next/navigation';

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
        { key: 'ArrowLeft', description: 'Previous page', run: () => go(neighbours.previous?.href) },
        { key: 'ArrowRight', description: 'Next page', run: () => go(neighbours.next?.href) },
        { key: 'ArrowLeft', shift: true, description: 'Previous tab', run: () => go(tabs[tabAt - 1]?.href) },
        { key: 'ArrowRight', shift: true, description: 'Next tab', run: () => go(tabs[tabAt + 1]?.href) },
        { key: 'j', description: 'Next section', run: () => actions.stepSection(1) },
        { key: 'k', description: 'Previous section', run: () => actions.stepSection(-1) },
        { key: 'y', description: 'Copy a link to this section', run: actions.copySection }
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
