'use client';

import { useSearchHotkey } from '@seedcord/ui';

import { useUIStore } from '#store/ui';

import type { ReactNode } from 'react';

interface HotkeyProviderProps {
    children: ReactNode;
}

export function HotkeyProvider({ children }: HotkeyProviderProps): ReactNode {
    useSearchHotkey(useUIStore((state) => state.toggleCommandPalette));

    return children;
}
