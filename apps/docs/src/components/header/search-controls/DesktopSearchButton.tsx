'use client';

import { Search, Command } from 'lucide-react';

import { log } from '@lib/logger';
import useUIStore from '@store/ui';
import Button from '@ui/Button';
import Icon from '@ui/Icon';

import type { ReactElement } from 'react';

function DesktopSearchButton(): ReactElement {
    const open = useUIStore((state) => state.isCommandPaletteOpen);
    const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);

    const handleClick = (): void => {
        log('Search button clicked');
        setCommandPaletteOpen(!open);
    };

    return (
        <Button
            variant="ghost"
            className="group shadow-soft w-full max-w-70 items-center justify-between rounded-xl border border-(--border) bg-(--surface-moderate) px-3 py-2 text-sm text-(--text) hover:border-(--border-accent-a-subtle) hover:bg-(--surface-accent-a-subtle) focus:border-(--border-accent-a-moderate) focus:ring-2 focus:ring-(--outline-accent-a-moderate) focus:ring-offset-2 focus:ring-offset-(--bg-surface-moderate-transparent) focus:outline-none"
            onClick={handleClick}
            aria-label="Search documentation"
        >
            <span className="text-subtle ease flex items-center gap-2 transition-colors duration-200 group-hover:text-(--text) group-focus:text-(--text)">
                <Icon icon={Search} size={16} />
                <span>Search docs</span>
            </span>
            <div className="text-subtle flex items-center gap-2 text-[0.65rem]">
                <kbd className="border-border bg-surface-moderate inline-flex items-center gap-1 rounded-md border px-2 py-1 font-semibold tracking-wide uppercase">
                    <Icon icon={Command} size={11} />
                    <span className="text-[0.7rem] leading-none">K</span>
                </kbd>
            </div>
        </Button>
    );
}

export default DesktopSearchButton;
