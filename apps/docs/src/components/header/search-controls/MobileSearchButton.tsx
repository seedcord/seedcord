'use client';

import { Button, Icon, cn } from '@seedcord/ui';
import { Search } from 'lucide-react';

import { log } from '@lib/logger';
import { useUIStore } from '@store/ui';

import type { ReactElement } from 'react';

function MobileSearchButton(): ReactElement {
    const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);

    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn('text-(--text) sm:hidden')}
            onClick={() => {
                log('Mobile search button clicked');
                setCommandPaletteOpen(true);
            }}
            aria-label="Open command palette"
        >
            <Icon icon={Search} size={16} />
        </Button>
    );
}

export default MobileSearchButton;
