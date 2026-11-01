'use client';

import { create } from 'zustand';

import { log } from '#lib/logger';
import { formatMemberAccessLabel, type MemberAccessLevel } from '#lib/memberAccess';

interface UIState {
    isMobileNavOpen: boolean;
    memberAccessLevel: MemberAccessLevel;
}

interface UIActions {
    setMobileNavOpen: (open: boolean) => void;
    setMemberAccessLevel: (level: MemberAccessLevel) => void;
}

export type UIStore = UIState & UIActions;

const DEFAULT_ACCESS_LEVEL: MemberAccessLevel = 'protected';

export const useUIStore = create<UIStore>((set) => ({
    isMobileNavOpen: false,
    memberAccessLevel: DEFAULT_ACCESS_LEVEL,

    setMobileNavOpen: (open) => {
        log('Mobile navigation visibility updated', { open });
        set({ isMobileNavOpen: open });
    },

    setMemberAccessLevel: (level) => {
        log('Member access filter changed', { level: formatMemberAccessLabel(level) });
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('docs.memberAccessLevel', level);
        }
        set({ memberAccessLevel: level });
    }
}));
