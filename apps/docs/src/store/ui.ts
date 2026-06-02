'use client';

import { create } from 'zustand';

import { log } from '@lib/logger';
import { formatMemberAccessLabel, type MemberAccessLevel } from '@lib/memberAccess';

interface UIState {
    isCommandPaletteOpen: boolean;
    memberAccessLevel: MemberAccessLevel;
}

interface UIActions {
    setCommandPaletteOpen: (open: boolean) => void;
    toggleCommandPalette: () => void;
    setMemberAccessLevel: (level: MemberAccessLevel) => void;
}

export type UIStore = UIState & UIActions;

const DEFAULT_ACCESS_LEVEL: MemberAccessLevel = 'protected';

export const useUIStore = create<UIStore>((set) => ({
    isCommandPaletteOpen: false,
    memberAccessLevel: DEFAULT_ACCESS_LEVEL,

    setCommandPaletteOpen: (open) => {
        log('Command palette visibility updated', { open });
        set({ isCommandPaletteOpen: open });
    },

    toggleCommandPalette: () =>
        set((state) => {
            const open = !state.isCommandPaletteOpen;
            log('Command palette toggled', { open });
            return { isCommandPaletteOpen: open };
        }),

    setMemberAccessLevel: (level) => {
        log('Member access filter changed', { level: formatMemberAccessLabel(level) });
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('docs.memberAccessLevel', level);
        }
        set({ memberAccessLevel: level });
    }
}));
