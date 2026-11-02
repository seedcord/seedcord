'use client';

import { Search } from 'lucide-react';

import { Button } from './Button';
import { ariaKeyshortcuts } from './HotkeyKeys';
import { Icon } from './Icon';
import { Kbd } from './Kbd';
import { cn } from './lib/cn';
import { useIsMac } from './lib/useIsMac';
import { searchKeys } from './lib/useSiteHotkeys';

import type { ReactElement } from 'react';

export interface SearchTriggerProps {
    label: string;
    onOpen: () => void;
}

export function SearchTrigger({ label, onOpen }: SearchTriggerProps): ReactElement {
    const isMac = useIsMac();

    return (
        <Button
            variant="field"
            onClick={onOpen}
            aria-label={label}
            aria-keyshortcuts={ariaKeyshortcuts(searchKeys(label), isMac)}
            className={cn('group hidden w-90 max-w-full justify-between gap-4 px-3 py-2 lg:flex')}
        >
            <span
                className={cn(
                    'text-subtle flex items-center gap-2 transition-colors duration-200 ease-out',
                    'group-hover:text-(--text) group-focus:text-(--text)'
                )}
            >
                <Icon icon={Search} size={16} />
                <span>{label}</span>
            </span>
            <Kbd aria-label={isMac ? 'Command K' : 'Control K'}>
                {/* ⌘ (U+2318) is a system-font glyph that aligns baseline + cap-height with the letter. an SVG icon does not. */}
                <span aria-hidden="true">{isMac ? '⌘K' : 'Ctrl+K'}</span>
            </Kbd>
        </Button>
    );
}

export function SearchIconButton({ label, onOpen }: SearchTriggerProps): ReactElement {
    const isMac = useIsMac();

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={onOpen}
            aria-label={label}
            aria-keyshortcuts={ariaKeyshortcuts(searchKeys(label), isMac)}
            className={cn('text-(--text) lg:hidden')}
        >
            <Icon icon={Search} size={16} />
        </Button>
    );
}
