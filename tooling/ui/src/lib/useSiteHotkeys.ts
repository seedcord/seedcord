'use client';

import { useState } from 'react';

import { useHotkeys } from './useHotkeys';

import type { Hotkey, HotkeySpec } from './useHotkeys';

export const searchKeys = (label: string): [toggle: HotkeySpec, open: HotkeySpec] => [
    { key: 'k', mod: true, description: label },
    { key: '/', description: label }
];

export const SWITCH_SITE: HotkeySpec = { key: 's', description: 'Switch site' };

const SHOW_HOTKEYS: HotkeySpec = { key: '?', description: 'Show keyboard shortcuts' };

type Overlay = 'search' | 'sites' | 'hotkeys' | 'panel';

type SiteRow = Hotkey & { overlay?: Overlay };

export interface SiteHotkeysOptions {
    searchLabel: string;
    search: { open: boolean; setOpen: (open: boolean) => void };
    panelOpen: boolean;
    pageRows?: readonly Hotkey[];
}

interface OpenState {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export interface SiteHotkeys {
    switcher: OpenState & { returnFocus: boolean };
    hotkeysDialog: OpenState & { hotkeys: readonly Hotkey[] };
}

const NO_ROWS: readonly Hotkey[] = [];

export function useSiteHotkeys({
    searchLabel,
    search,
    panelOpen,
    pageRows = NO_ROWS
}: SiteHotkeysOptions): SiteHotkeys {
    const [sites, setSites] = useState({ open: false, openedByKey: false });
    const [hotkeysOpen, setHotkeysOpen] = useState(false);

    const [toggleSearch, openSearch] = searchKeys(searchLabel);
    const rows: SiteRow[] = [
        { ...toggleSearch, overlay: 'search', run: () => search.setOpen(!search.open) },
        { ...openSearch, overlay: 'search', run: () => search.setOpen(true) },
        {
            ...SWITCH_SITE,
            overlay: 'sites',
            run: () => setSites((was) => ({ open: !was.open, openedByKey: was.open ? was.openedByKey : true }))
        },
        ...pageRows,
        { ...SHOW_HOTKEYS, overlay: 'hotkeys', run: () => setHotkeysOpen((was) => !was) }
    ];

    const openOverlays: [Overlay, boolean][] = [
        ['search', search.open],
        ['sites', sites.open],
        ['hotkeys', hotkeysOpen],
        ['panel', panelOpen]
    ];
    const overlay = openOverlays.find(([, open]) => open)?.[0];
    useHotkeys(overlay === undefined ? rows : rows.filter((row) => row.overlay === overlay));

    return {
        switcher: {
            open: sites.open,
            onOpenChange: (open) => setSites((was) => ({ open, openedByKey: open ? false : was.openedByKey })),
            returnFocus: !sites.openedByKey
        },
        hotkeysDialog: { open: hotkeysOpen, onOpenChange: setHotkeysOpen, hotkeys: rows }
    };
}
