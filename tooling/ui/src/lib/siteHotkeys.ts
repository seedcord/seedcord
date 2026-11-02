import type { Hotkey } from './useHotkeys';

export interface SiteHotkeyActions {
    toggleSearch: () => void;
    openSearch: () => void;
    openSites: () => void;
    showHotkeys: () => void;
}

export function siteHotkeys(
    searchLabel: string,
    actions: SiteHotkeyActions,
    pageRows: readonly Hotkey[] = []
): Hotkey[] {
    return [
        { key: 'k', mod: true, description: searchLabel, run: actions.toggleSearch },
        { key: '/', description: searchLabel, run: actions.openSearch },
        { key: 's', description: 'Switch site', run: actions.openSites },
        ...pageRows,
        { key: '?', description: 'Show keyboard shortcuts', run: actions.showHotkeys }
    ];
}
