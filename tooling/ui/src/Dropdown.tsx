'use client';

import { Check } from 'lucide-react';
import { Fragment, useId, useState } from 'react';

import { CaretTrigger } from './CaretTrigger';
import { cn } from './lib/cn';
import { tw } from './lib/tw';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

import type { CaretTriggerSize, CaretTriggerVariant } from './CaretTrigger';
import type { ReactElement, ReactNode } from 'react';

export type DropdownVariant = CaretTriggerVariant;
export type DropdownSize = CaretTriggerSize;

const dropdownContentClassName = tw`w-(--radix-popover-trigger-width) min-w-44 overflow-hidden p-1`;

const dropdownItemBaseClassName = cn(
    tw`relative flex w-full cursor-pointer items-center justify-between gap-2 select-none`,
    tw`rounded-md`,
    tw`px-3 py-2 text-sm text-(--text)`,
    tw`transition-colors duration-100 ease-out`,
    tw`hover:bg-(--bg-accent-b-moderate)`,
    tw`focus-visible:bg-(--bg-accent-b-moderate) focus-visible:outline-hidden`,
    tw`aria-selected:bg-(--bg-accent-b-strong) aria-selected:font-semibold`
);

// Rendered with role="presentation" so the separator label isn't announced as a listbox option.
const dropdownGroupSeparatorClassName = cn(
    tw`mt-1 mb-0.5 border-t border-(--border) px-3 pt-2 pb-0.5`,
    tw`text-[10px] font-semibold tracking-wide text-(--text-faint) uppercase`
);

export interface DropdownOption {
    value: string;
    label: string;
    trailing?: ReactNode;
    disabled?: boolean;
}

export interface DropdownGroup {
    id: string;
    label?: string;
    options: readonly DropdownOption[];
}

interface DropdownListboxProps {
    listboxId: string;
    groups: readonly DropdownGroup[];
    value: string;
    onSelect: (value: string) => void;
}

function DropdownListbox({ listboxId, groups, value, onSelect }: DropdownListboxProps): ReactElement {
    return (
        <ul
            id={listboxId}
            role="listbox"
            className={cn(
                'max-h-[min(18rem,var(--radix-popover-content-available-height))] space-y-0.5 overflow-y-auto overscroll-y-contain'
            )}
        >
            {groups.map((group, index) => (
                <Fragment key={group.id}>
                    {index > 0 ? (
                        <li role="presentation" className={cn(dropdownGroupSeparatorClassName)}>
                            {group.label}
                        </li>
                    ) : null}
                    {group.options.map((opt) => {
                        if (opt.disabled) {
                            return (
                                <li
                                    key={opt.value}
                                    role="presentation"
                                    className={cn('px-3 py-2 text-sm text-(--text-faint) select-none')}
                                >
                                    {opt.label}
                                </li>
                            );
                        }
                        const isSelected = opt.value === value;
                        return (
                            <li key={opt.value} role="presentation">
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => onSelect(opt.value)}
                                    className={cn(dropdownItemBaseClassName)}
                                >
                                    <span className={cn('truncate')}>{opt.label}</span>
                                    <span className={cn('flex shrink-0 items-center gap-1.5')}>
                                        {opt.trailing}
                                        {isSelected ? (
                                            <Check size={16} aria-hidden className={cn('text-(--rind)')} />
                                        ) : null}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </Fragment>
            ))}
        </ul>
    );
}

export interface DropdownProps {
    placeholderLabel: string;
    value: string;
    options?: readonly DropdownOption[];
    groups?: readonly DropdownGroup[];
    onChange: (value: string) => void;
    leadingIcon?: ReactNode;
    minWidth?: string;
    variant?: DropdownVariant;
    fieldSize?: DropdownSize;
    // portal target for the listbox (see PopoverContent.container), needed inside a modal Dialog
    container?: HTMLElement | null;
    error?: boolean;
    disabled?: boolean;
    id?: string;
    className?: string;
    'aria-labelledby'?: string;
    'aria-label'?: string;
}

const NO_OPTIONS: readonly DropdownOption[] = [];

export function Dropdown({
    leadingIcon,
    placeholderLabel,
    value,
    options = NO_OPTIONS,
    groups,
    onChange,
    minWidth,
    variant = 'default',
    fieldSize = 'md',
    container,
    error = false,
    disabled = false,
    id,
    className,
    'aria-labelledby': ariaLabelledBy,
    'aria-label': ariaLabel
}: DropdownProps): ReactElement {
    const [open, setOpen] = useState(false);
    const listboxId = useId();
    const resolvedGroups: readonly DropdownGroup[] = groups ?? [{ id: 'default', options }];
    const selected = resolvedGroups.flatMap((group) => group.options).find((option) => option.value === value);
    const displayLabel = selected?.label ?? placeholderLabel;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <CaretTrigger
                    id={id}
                    label={displayLabel}
                    open={open}
                    variant={variant}
                    fieldSize={fieldSize}
                    leadingIcon={leadingIcon}
                    aria-haspopup="listbox"
                    aria-controls={listboxId}
                    aria-labelledby={ariaLabelledBy}
                    aria-label={ariaLabel}
                    aria-invalid={error || undefined}
                    disabled={disabled}
                    style={minWidth !== undefined ? { minWidth } : undefined}
                    className={className}
                />
            </PopoverTrigger>
            <PopoverContent
                align="start"
                sideOffset={6}
                collisionPadding={8}
                container={container ?? null}
                className={dropdownContentClassName}
            >
                <DropdownListbox
                    listboxId={listboxId}
                    groups={resolvedGroups}
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
