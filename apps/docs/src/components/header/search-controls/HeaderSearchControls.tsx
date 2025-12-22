'use client';

import DesktopSearchButton from './DesktopSearchButton';
import MobileSearchButton from './MobileSearchButton';
import ThemeToggle from './ThemeToggle';

import type { ReactElement } from 'react';

function HeaderSearchControls(): ReactElement {
    return (
        <div className="flex items-center gap-2">
            <div className="hidden sm:flex sm:w-full sm:max-w-[280px]">
                <DesktopSearchButton />
            </div>
            <MobileSearchButton />
            <ThemeToggle />
        </div>
    );
}

export default HeaderSearchControls;
