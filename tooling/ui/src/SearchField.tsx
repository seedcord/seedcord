'use client';

import { cn } from 'cn';
import { LoaderCircle, Search } from 'lucide-react';

import { CloseControls } from './CloseControls';
import { IconSwap } from './IconSwap';
import { Input } from './Input';
import { useSearchDialogListExpanded } from './SearchDialog';

import type { KeyboardEvent, ReactElement, ReactNode, RefObject } from 'react';

export interface SearchFieldProps {
    inputRef: RefObject<HTMLInputElement | null>;
    value: string;
    onValueChange: (value: string) => void;
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    onClose: () => void;
    label: string;
    closeLabel: string;
    placeholder?: string;
    maxLength?: number;
    listboxId: string;
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
    maxLength,
    listboxId,
    activeId,
    isSearching = false,
    leading,
    trailing,
    aboveOnMobile
}: SearchFieldProps): ReactElement {
    const listExpanded = useSearchDialogListExpanded();

    return (
        <>
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
                maxLength={maxLength}
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
        </>
    );
}
