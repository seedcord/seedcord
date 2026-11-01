'use client';

import { useHotkeys } from '@seedcord/ui';
import { createContext, use, useMemo, useState } from 'react';

import type { ReactNode } from 'react';

interface CommandPaletteOpen {
    open: boolean;
    setOpen: (open: boolean) => void;
}

const CommandPaletteContext = createContext<CommandPaletteOpen | null>(null);

export function useCommandPaletteOpen(): CommandPaletteOpen {
    const value = use(CommandPaletteContext);
    if (value === null) throw new Error('useCommandPaletteOpen must be called inside a CommandPaletteProvider');
    return value;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }): ReactNode {
    const [open, setOpen] = useState(false);
    useHotkeys([{ key: 'k', mod: true, description: 'Search docs', run: () => setOpen((wasOpen) => !wasOpen) }]);
    const value = useMemo(() => ({ open, setOpen }), [open]);

    return <CommandPaletteContext value={value}>{children}</CommandPaletteContext>;
}
