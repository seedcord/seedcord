import type { Hotkey, HotkeySpec } from './useHotkeys';

export interface SiteHotkeyActions {
    toggleSearch: () => void;
    openSearch: () => void;
    openSites: () => void;
    showHotkeys: () => void;
}

export const searchKeys = (label: string): [toggle: HotkeySpec, open: HotkeySpec] => [
    { key: 'k', mod: true, description: label },
    { key: '/', description: label }
];

export const SWITCH_SITE: HotkeySpec = { key: 's', description: 'Switch site' };

const SHOW_HOTKEYS: HotkeySpec = { key: '?', description: 'Show keyboard shortcuts' };

export function siteHotkeys(
    searchLabel: string,
    actions: SiteHotkeyActions,
    pageRows: readonly Hotkey[] = []
): Hotkey[] {
    const [toggleSearch, openSearch] = searchKeys(searchLabel);
    return [
        { ...toggleSearch, run: actions.toggleSearch },
        { ...openSearch, run: actions.openSearch },
        { ...SWITCH_SITE, run: actions.openSites },
        ...pageRows,
        { ...SHOW_HOTKEYS, run: actions.showHotkeys }
    ];
}
