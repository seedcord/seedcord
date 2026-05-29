'use client';

import { cn } from '@seedcord/ui';

import DesktopSearchButton from './DesktopSearchButton';
import MobileSearchButton from './MobileSearchButton';
import ThemeToggle from './ThemeToggle';

import type { ReactElement } from 'react';

function HeaderSearchControls(): ReactElement {
    return (
        <div className={cn('flex items-center gap-2')}>
            <div className={cn('hidden sm:flex sm:w-full sm:max-w-70')}>
                <DesktopSearchButton />
            </div>
            <MobileSearchButton />
            <ThemeToggle />
        </div>
    );
}

export default HeaderSearchControls;
