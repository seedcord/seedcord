'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

import { cn } from './lib/cn';
import { tw } from './lib/tw';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

import type { ReactElement, ReactNode } from 'react';

const dropdownTriggerBaseClassName = [
    tw`inline-flex w-full items-center justify-between gap-2`,
    tw`rounded-lg`,
    tw`border border-(--border) bg-(--bg-popover) font-medium text-(--text)`,
    tw`transition-[transform,background-color,color,border-color,box-shadow] duration-150 ease-out`,
    tw`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-outline-b)`,
    tw`hover:border-(--accent-b)/50`,
    tw`data-[state=open]:border-(--accent-b) data-[state=open]:bg-(--bg-accent-b-moderate)`,
    tw`disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50`,
    tw`aria-invalid:border-(--accent-a) aria-invalid:focus-visible:outline-(--accent-a)`
].join(' ');

const dropdownTriggerSizeClasses = {
    sm: tw`h-8 px-3 text-sm`,
    md: tw`h-10 px-4 text-sm`
} as const;

export type DropdownSize = keyof typeof dropdownTriggerSizeClasses;

const dropdownContentClassName = tw`w-(--radix-popover-trigger-width) min-w-44 overflow-hidden p-1`;

const dropdownItemBaseClassName = [
    tw`relative flex w-full cursor-pointer items-center justify-between gap-2 select-none`,
    tw`rounded-lg`,
    tw`px-3 py-2 text-sm text-(--text)`,
    tw`transition-colors duration-100 ease-out`,
    tw`hover:bg-(--bg-accent-b-moderate)`,
    tw`focus-visible:outline-2 focus-visible:outline-offset-(-2) focus-visible:outline-(--focus-outline-b)`,
    tw`aria-selected:bg-(--bg-accent-b-strong) aria-selected:font-semibold`
].join(' ');

export interface DropdownOption {
    value: string;
    label: string;
}

interface DropdownListboxProps {
    listboxId: string;
    options: readonly DropdownOption[];
    value: string;
    onSelect: (value: string) => void;
}

function DropdownListbox({ listboxId, options, value, onSelect }: DropdownListboxProps): ReactElement {
    return (
        <ul id={listboxId} role="listbox" className={cn('max-h-72 space-y-0.5 overflow-y-auto overscroll-y-contain')}>
            {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                    <li key={opt.value}>
                        <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => onSelect(opt.value)}
                            className={cn(dropdownItemBaseClassName)}
                        >
                            <span className={cn('truncate')}>{opt.label}</span>
                            {isSelected ? (
                                <Check size={16} aria-hidden className={cn('shrink-0 text-(--accent-b)')} />
                            ) : null}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

export interface DropdownProps {
    placeholderLabel: string;
    value: string;
    options: readonly DropdownOption[];
    onChange: (value: string) => void;
    leadingIcon?: ReactNode;
    minWidth?: string;
    fieldSize?: DropdownSize;
    error?: boolean;
    disabled?: boolean;
    id?: string;
    className?: string;
    'aria-labelledby'?: string;
    'aria-label'?: string;
}

export function Dropdown({
    leadingIcon,
    placeholderLabel,
    value,
    options,
    onChange,
    minWidth,
    fieldSize = 'md',
    error = false,
    disabled = false,
    id,
    className,
    'aria-labelledby': ariaLabelledBy,
    'aria-label': ariaLabel
}: DropdownProps): ReactElement {
    const [open, setOpen] = useState(false);
    const listboxId = useId();
    const selected = options.find((o) => o.value === value);
    const displayLabel = selected?.label ?? placeholderLabel;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    id={id}
                    type="button"
                    aria-haspopup="listbox"
                    aria-controls={listboxId}
                    aria-labelledby={ariaLabelledBy}
                    aria-label={ariaLabel}
                    aria-invalid={error || undefined}
                    disabled={disabled}
                    style={minWidth !== undefined ? { minWidth } : undefined}
                    className={cn(dropdownTriggerBaseClassName, dropdownTriggerSizeClasses[fieldSize], className)}
                >
                    {leadingIcon ? (
                        <span aria-hidden className={cn('inline-flex shrink-0 items-center text-(--text-muted)')}>
                            {leadingIcon}
                        </span>
                    ) : null}
                    <span className={cn('flex-1 truncate text-left')}>{displayLabel}</span>
                    <ChevronDown
                        size={16}
                        aria-hidden
                        className={cn(
                            'text-subtle shrink-0 transition-transform duration-200 ease-out',
                            open && 'rotate-180'
                        )}
                    />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={6} className={dropdownContentClassName}>
                <DropdownListbox
                    listboxId={listboxId}
                    options={options}
                    value={value}
                    onSelect={(next) => {
                        onChange(next);
                        setOpen(false);
                    }}
                />
            </PopoverContent>
        </Popover>
    );
}
