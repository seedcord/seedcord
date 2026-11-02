'use client';

import { useHotkeys } from '@seedcord/ui';

import { SEARCH_LABEL } from './GuideSearch';

import type { Hotkey } from '@seedcord/ui';

export interface GuideHotkeyActions {
    toggleSearch: () => void;
    showHotkeys: () => void;
}

export function useGuideHotkeys({ toggleSearch, showHotkeys }: GuideHotkeyActions): readonly Hotkey[] {
    const hotkeys: Hotkey[] = [
        { key: 'k', mod: true, description: SEARCH_LABEL, run: toggleSearch },
        { key: '?', description: 'Show keyboard shortcuts', run: showHotkeys }
    ];
    useHotkeys(hotkeys);
    return hotkeys;
}
