'use client';

import { useEffect } from 'react';

import { registerCommandPaletteHotkey } from '@lib/hotkeys';
import useUIStore from '@store/ui';

import type { ReactNode } from 'react';

interface HotkeyProviderProps {
    children: ReactNode;
}

function HotkeyProvider({ children }: HotkeyProviderProps): ReactNode {
    const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);

    useEffect(() => {
        const unregister = registerCommandPaletteHotkey(setCommandPaletteOpen);

        return unregister;
    }, [setCommandPaletteOpen]);

    return children;
}

export default HotkeyProvider;
