'use client';

import { copyLink, useHotkeys } from '@seedcord/ui';
import { useActiveAnchor } from 'fumadocs-core/toc';
import { useRouter } from 'next/navigation';

import { SEARCH_LABEL } from './GuideSearch';

import type { GuideTab } from '#lib/nav';
import type { PageNeighbours } from '#lib/neighbours';
import type { Hotkey } from '@seedcord/ui';

export interface GuideHotkeyActions {
    toggleSearch: () => void;
    openSearch: () => void;
    openSites: () => void;
    showHotkeys: () => void;
    go: (href: string) => void;
    scrollTo: (id: string) => void;
    copyLink: (id: string | undefined) => void;
}

export interface GuidePlace {
    tabs: readonly GuideTab[];
    activeHref: string;
    neighbours: PageNeighbours;
    headingIds: readonly string[];
    currentId: string | undefined;
}

export function guideHotkeys(actions: GuideHotkeyActions, place: GuidePlace): Hotkey[] {
    const { tabs, activeHref, neighbours, headingIds, currentId } = place;
    const tabAt = tabs.findIndex((tab) => tab.href === activeHref);
    const headingAt = currentId === undefined ? -1 : headingIds.indexOf(currentId);
    const go = (href: string | undefined): void => {
        if (href !== undefined) actions.go(href);
    };
    const scrollTo = (id: string | undefined): void => {
        if (id !== undefined) actions.scrollTo(id);
    };

    return [
        { key: 'k', mod: true, description: SEARCH_LABEL, run: actions.toggleSearch },
        { key: '/', description: SEARCH_LABEL, run: actions.openSearch },
        { key: 's', description: 'Switch site', run: actions.openSites },
        { key: 'ArrowLeft', description: 'Previous page', run: () => go(neighbours.previous?.href) },
        { key: 'ArrowRight', description: 'Next page', run: () => go(neighbours.next?.href) },
        { key: 'ArrowLeft', shift: true, description: 'Previous tab', run: () => go(tabs[tabAt - 1]?.href) },
        { key: 'ArrowRight', shift: true, description: 'Next tab', run: () => go(tabs[tabAt + 1]?.href) },
        { key: 'j', description: 'Next section', run: () => scrollTo(headingIds[headingAt + 1]) },
        { key: 'k', description: 'Previous section', run: () => scrollTo(headingIds[headingAt - 1]) },
        { key: 'y', description: 'Copy a link to this section', run: () => actions.copyLink(currentId) },
        { key: '?', description: 'Show keyboard shortcuts', run: actions.showHotkeys }
    ];
}

type GuideHotkeyOpeners = Pick<GuideHotkeyActions, 'toggleSearch' | 'openSearch' | 'openSites' | 'showHotkeys'>;

// the heading in view comes from fumadocs' AnchorProvider
export type GuidePage = Omit<GuidePlace, 'currentId'>;

export function useGuideHotkeys(openers: GuideHotkeyOpeners, page: GuidePage): readonly Hotkey[] {
    const router = useRouter();
    const currentId = useActiveAnchor();
    const hotkeys = guideHotkeys(
        {
            ...openers,
            go: (href) => router.push(href),
            scrollTo: (id) => document.getElementById(id)?.scrollIntoView({ block: 'start' }),
            copyLink: (id) => void copyLink(id).catch(() => {})
        },
        { ...page, currentId }
    );
    useHotkeys(hotkeys);
    return hotkeys;
}
