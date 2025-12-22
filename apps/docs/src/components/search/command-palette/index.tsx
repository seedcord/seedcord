'use client';

import CommandPaletteDialog from './CommandPaletteDialog';
import { useCommandPaletteController } from './useCommandPaletteController';

import type { ReactElement } from 'react';

export function CommandPalette(): ReactElement | null {
    const controller = useCommandPaletteController();

    if (!controller.mounted) {
        return null;
    }

    return <CommandPaletteDialog controller={controller} />;
}

export default CommandPalette;
