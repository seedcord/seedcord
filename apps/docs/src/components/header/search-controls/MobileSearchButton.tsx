'use client';

import { Search } from 'lucide-react';

import { log } from '@lib/logger';
import useUIStore from '@store/ui';
import Button from '@ui/Button';
import Icon from '@ui/Icon';

import type { ReactElement } from 'react';

function MobileSearchButton(): ReactElement {
    const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);

    return (
        <Button
            variant="ghost"
            size="icon"
            className="text-(--text) sm:hidden"
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
