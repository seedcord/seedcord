'use client';

import { Search } from 'lucide-react';

import { Button } from './Button';
import { Icon } from './Icon';
import { cn } from './lib/cn';
import { useIsMac } from './lib/useIsMac';

import type { ReactElement } from 'react';

export interface SearchTriggerProps {
    label: string;
    onOpen: () => void;
}

export function SearchTrigger({ label, onOpen }: SearchTriggerProps): ReactElement {
    const isMac = useIsMac();

    return (
        <Button
            variant="ghost"
            onClick={onOpen}
            aria-label={label}
            className={cn(
                'group hidden w-90 max-w-full items-center justify-between gap-4 border border-(--border)',
                'bg-(--surface-moderate) px-3 py-2 text-sm text-(--text) lg:flex',
                'hover:border-(--border-accent-a-subtle) hover:bg-(--surface-accent-a-subtle)'
            )}
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
            <kbd
                aria-label={isMac ? 'Command K' : 'Control K'}
                className={cn(
                    'inline-flex items-center rounded-md border border-(--border) bg-(--surface-moderate) px-2 py-1',
                    'font-sans text-xs leading-none font-semibold tracking-wide text-(--text-muted)'
                )}
            >
                {/* ⌘ (U+2318) is a system-font glyph that aligns baseline + cap-height with the letter. an SVG icon does not. */}
                <span aria-hidden="true">{isMac ? '⌘K' : 'Ctrl+K'}</span>
            </kbd>
        </Button>
    );
}

export function SearchIconButton({ label, onOpen }: SearchTriggerProps): ReactElement {
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={onOpen}
            aria-label={label}
            className={cn('text-(--text) lg:hidden')}
        >
            <Icon icon={Search} size={16} />
        </Button>
    );
}
