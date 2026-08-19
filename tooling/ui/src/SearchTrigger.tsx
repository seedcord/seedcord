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
        <>
            <Button
                variant="ghost"
                onClick={onOpen}
                aria-label={label}
                className={cn(
                    'group hidden w-full max-w-70 items-center justify-between border border-(--border)',
                    'bg-(--surface-moderate) px-3 py-2 text-sm text-(--text) sm:flex',
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
                        'border-border bg-surface-moderate inline-flex items-center rounded-md border px-2 py-1',
                        'font-sans text-xs leading-none font-semibold tracking-wide text-(--text-faint)'
                    )}
                >
                    {/* ⌘ (U+2318) is a system-font glyph that aligns baseline + cap-height with the letter. an SVG icon does not. */}
                    <span aria-hidden="true">{isMac ? '⌘K' : 'Ctrl+K'}</span>
                </kbd>
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={onOpen}
                aria-label={label}
                className={cn('text-(--text) sm:hidden')}
            >
                <Icon icon={Search} size={16} />
            </Button>
        </>
    );
}
