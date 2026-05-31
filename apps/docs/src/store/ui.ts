'use client';

import { DEFAULT_MANIFEST_PACKAGE, DEFAULT_VERSION } from '@seedcord/docs-engine/client';
import { create } from 'zustand';

import { log } from '@lib/logger';
import { formatMemberAccessLabel, type MemberAccessLevel } from '@lib/memberAccess';

interface UIState {
    isCommandPaletteOpen: boolean;
    selectedPackage: string;
    selectedVersion: string;
    memberAccessLevel: MemberAccessLevel;
}

interface UIActions {
    setCommandPaletteOpen: (open: boolean) => void;
    toggleCommandPalette: () => void;
    setSelectedPackage: (pkg: string) => void;
    setSelectedVersion: (version: string) => void;
    setMemberAccessLevel: (level: MemberAccessLevel) => void;
}

export type UIStore = UIState & UIActions;

const DEFAULT_ACCESS_LEVEL: MemberAccessLevel = 'protected';

export const useUIStore = create<UIStore>((set) => ({
    isCommandPaletteOpen: false,
    selectedPackage: DEFAULT_MANIFEST_PACKAGE,
    selectedVersion: DEFAULT_VERSION,
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

    setSelectedPackage: (pkg) => {
        log('Package filter changed', { pkg });
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('docs.selectedPackage', pkg);
        }
        set({ selectedPackage: pkg });
    },

    setSelectedVersion: (version) => {
        log('Version filter changed', { version });
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('docs.selectedVersion', version);
        }
        set({ selectedVersion: version });
    },

    setMemberAccessLevel: (level) => {
        log('Member access filter changed', { level: formatMemberAccessLabel(level) });
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('docs.memberAccessLevel', level);
        }
        set({ memberAccessLevel: level });
    }
}));
