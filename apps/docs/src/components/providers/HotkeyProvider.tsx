'use client';

import { useEffect } from 'react';

import { registerCommandPaletteHotkey } from '#lib/hotkeys';
import { useUIStore } from '#store/ui';

import type { ReactNode } from 'react';

interface HotkeyProviderProps {
    children: ReactNode;
}

export function HotkeyProvider({ children }: HotkeyProviderProps): ReactNode {
    const toggleCommandPalette = useUIStore((state) => state.toggleCommandPalette);

    useEffect(() => {
        const unregister = registerCommandPaletteHotkey(toggleCommandPalette);

        return unregister;
    }, [toggleCommandPalette]);

    return children;
}
