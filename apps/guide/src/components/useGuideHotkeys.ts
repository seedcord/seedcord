'use client';

import { useHotkeys } from '@seedcord/ui';

import { SEARCH_LABEL } from './GuideSearch';

export interface GuideHotkeyActions {
    toggleSearch: () => void;
}

export function useGuideHotkeys({ toggleSearch }: GuideHotkeyActions): void {
    useHotkeys([{ key: 'k', mod: true, description: SEARCH_LABEL, run: toggleSearch }]);
}
