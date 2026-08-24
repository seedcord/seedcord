'use client';

import { LoaderCircle, Search, X } from 'lucide-react';

import { Button } from './Button';
import { Icon } from './Icon';
import { IconSwap } from './IconSwap';
import { Input } from './Input';
import { cn } from './lib/cn';

import type { KeyboardEvent, ReactElement, ReactNode, RefObject } from 'react';

function CloseControls({ onClose, label }: { onClose: () => void; label: string }): ReactElement {
    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label={label}
                className={cn('text-subtle size-9 rounded-md hover:text-(--text) sm:hidden')}
            >
                <Icon icon={X} size={16} aria-hidden />
            </Button>
            <Button
                variant="ghost"
                onClick={onClose}
                aria-label={label}
                className={cn(
                    'text-subtle hidden h-auto items-center rounded-md border border-(--border)',
                    'bg-(--surface-moderate) px-2 py-1 text-xs leading-none font-semibold tracking-wide uppercase',
                    'hover:bg-(--surface-moderate) hover:text-(--text) sm:inline-flex'
                )}
            >
                Esc
            </Button>
        </>
    );
}

export interface SearchFieldProps {
    inputRef: RefObject<HTMLInputElement | null>;
    value: string;
    onValueChange: (value: string) => void;
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    onClose: () => void;
    label: string;
    closeLabel: string;
    placeholder?: string;
    listboxId: string;
    listExpanded: boolean;
    activeId?: string | undefined;
    isSearching?: boolean;
    leading?: ReactNode;
    trailing?: ReactNode;
    aboveOnMobile?: ReactNode;
}

export function SearchField({
    inputRef,
    value,
    onValueChange,
    onKeyDown,
    onClose,
    label,
    closeLabel,
    placeholder = 'Search…',
    listboxId,
    listExpanded,
    activeId,
    isSearching = false,
    leading,
    trailing,
    aboveOnMobile
}: SearchFieldProps): ReactElement {
    return (
        <div className={cn('px-4 py-3', listExpanded && 'border-border border-b')}>
            {aboveOnMobile ? <div className={cn('mb-2 sm:hidden')}>{aboveOnMobile}</div> : null}
            <Input
                ref={inputRef}
                role="combobox"
                aria-expanded={listExpanded}
                aria-controls={listboxId}
                aria-activedescendant={activeId}
                aria-autocomplete="list"
                autoComplete="off"
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                aria-label={label}
                variant="ghost"
                className={cn(
                    'border border-(--border)/80 bg-(--surface-subtle)',
                    'focus-within:border-(--border-accent-b-subtle) focus-within:bg-(--surface-accent-b-subtle)'
                )}
                leading={
                    <span className={cn('flex items-center gap-1')}>
                        <IconSwap
                            active={isSearching}
                            idleIcon={Search}
                            activeIcon={LoaderCircle}
                            size={16}
                            className={cn('text-subtle')}
                            activeClassName={cn('animate-spin motion-reduce:animate-none')}
                        />
                        {leading}
                    </span>
                }
                trailing={
                    <span className={cn('flex items-center gap-2')}>
                        {trailing}
                        {trailing ? (
                            <span className={cn('hidden h-4 w-px bg-(--border) sm:block')} aria-hidden />
                        ) : null}
                        <CloseControls onClose={onClose} label={closeLabel} />
                    </span>
                }
            />
        </div>
    );
}
