'use client';

import { useSearchHotkey } from '@seedcord/ui';
import { createContext, use, useMemo, useState } from 'react';

import type { ReactNode } from 'react';

interface CommandPaletteOpen {
    open: boolean;
    setOpen: (open: boolean) => void;
}

// zustand applies an update at once, even inside startTransition
const CommandPaletteContext = createContext<CommandPaletteOpen | null>(null);

export function useCommandPaletteOpen(): CommandPaletteOpen {
    const value = use(CommandPaletteContext);
    if (value === null) throw new Error('useCommandPaletteOpen must be called inside a CommandPaletteProvider');
    return value;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }): ReactNode {
    const [open, setOpen] = useState(false);
    useSearchHotkey(() => setOpen((wasOpen) => !wasOpen));
    const value = useMemo(() => ({ open, setOpen }), [open]);

    return <CommandPaletteContext value={value}>{children}</CommandPaletteContext>;
}
