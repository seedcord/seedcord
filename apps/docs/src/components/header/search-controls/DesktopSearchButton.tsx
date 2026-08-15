'use client';

import { Button, Icon, cn } from '@seedcord/ui';
import { Search } from 'lucide-react';

import { log } from '#lib/logger';
import { useIsMac } from '#lib/platform';
import { useUIStore } from '#store/ui';

import type { ReactElement } from 'react';

export function DesktopSearchButton(): ReactElement {
    const open = useUIStore((state) => state.isCommandPaletteOpen);
    const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
    const isMac = useIsMac();

    const toggleCommandPalette = (): void => {
        log('Search button clicked');
        setCommandPaletteOpen(!open);
    };

    return (
        <Button
            variant="ghost"
            className={cn(
                'group shadow-soft w-full max-w-70 items-center justify-between border border-(--border) bg-(--surface-moderate) px-3 py-2 text-sm text-(--text) hover:border-(--border-accent-a-subtle) hover:bg-(--surface-accent-a-subtle)'
            )}
            onClick={toggleCommandPalette}
            aria-label="Search documentation"
        >
            <span
                className={cn(
                    'text-subtle ease flex items-center gap-2 transition-colors duration-200 group-hover:text-(--text) group-focus:text-(--text)'
                )}
            >
                <Icon icon={Search} size={16} />
                <span>Search docs</span>
            </span>
            <div className={cn('text-subtle flex items-center gap-2 text-[0.65rem]')}>
                <kbd
                    aria-label={isMac ? 'Command K' : 'Control K'}
                    className={cn(
                        'border-border bg-surface-moderate inline-flex items-center rounded-md border px-2 py-1 font-sans text-xs leading-none font-semibold tracking-wide'
                    )}
                >
                    {/* ⌘ (U+2318) is a system-font glyph that aligns baseline + cap-height with the letter. an SVG icon does not. */}
                    <span aria-hidden="true">{isMac ? '⌘K' : 'Ctrl+K'}</span>
                </kbd>
            </div>
        </Button>
    );
}
