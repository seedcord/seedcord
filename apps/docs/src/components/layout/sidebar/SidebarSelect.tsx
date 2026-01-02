'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@lib/utils';

import type { ReactElement } from 'react';

interface SidebarSelectOption {
    id: string;
    label: string;
}

interface SidebarSelectProps {
    id: string;
    label: string;
    value: string;
    options: readonly SidebarSelectOption[];
    onChange: (value: string) => void;
}

function SidebarSelect({ id, label, value, options, onChange }: SidebarSelectProps): ReactElement {
    const labelId = `${id}-label`;
    const [open, setOpen] = useState(false);
    const selectedLabel = useMemo(
        () => options.find((option) => option.id === value)?.label ?? value,
        [options, value]
    );

    const handleValueChange = (nextValue: string): void => {
        onChange(nextValue);
        setOpen(false);
    };

    return (
        <div className="space-y-1">
            <label id={labelId} className="text-subtle text-xs font-semibold tracking-wide uppercase" htmlFor={id}>
                {label}
            </label>
            <DropdownMenu.Root open={open} onOpenChange={setOpen} modal={false}>
                <DropdownMenu.Trigger asChild>
                    <button
                        id={id}
                        type="button"
                        aria-labelledby={labelId}
                        aria-expanded={open}
                        className={cn(
                            'border-border/80 shadow-soft flex w-full items-center justify-between rounded-lg border bg-(--bg-surface-subtle) px-4 py-2 text-sm font-medium text-(--text) transition duration-0',
                            'focus:border-(--border-accent-b-moderate) focus:bg-(--bg-accent-b-subtle) focus:ring-2 focus:ring-(--outline-accent-b-subtle) focus:ring-offset-2 focus:ring-offset-(--bg-transparent-subtle) focus:outline-none',
                            open
                                ? 'border-(--border-accent-b-strong) bg-(--bg-accent-b-moderate) shadow-[0_10px_35px_-20px_var(--outline-accent-b-moderate)]'
                                : null
                        )}
                    >
                        <span className="truncate">{selectedLabel}</span>
                        <ChevronDown
                            className={cn(
                                'text-subtle h-4 w-4 transition-transform duration-200',
                                open ? 'rotate-180 text-(--text-accent-b-subtle)' : null
                            )}
                            aria-hidden
                        />
                    </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        align="start"
                        sideOffset={8}
                        className="border-border/80 z-70 w-(--radix-dropdown-menu-trigger-width) min-w-55 overflow-hidden rounded-lg border bg-(--bg-dim-subtle) p-1 shadow-[0_18px_36px_-16px_var(--text-faint)] transition-colors duration-200"
                    >
                        <DropdownMenu.RadioGroup value={value} onValueChange={handleValueChange}>
                            {options.map((option) => (
                                <DropdownMenu.RadioItem
                                    key={option.id}
                                    value={option.id}
                                    className="relative flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-(--text) transition-colors duration-200 outline-none select-none data-highlighted:bg-(--bg-accent-b-moderate) data-highlighted:text-(--text-accent-b-subtle) data-[state=checked]:border data-[state=checked]:border-(--border-accent-b-subtle) data-[state=checked]:bg-(--bg-accent-b-strong) data-[state=checked]:font-semibold data-[state=checked]:text-(--text-accent-b-subtle)"
                                >
                                    <DropdownMenu.ItemIndicator className="absolute right-3 flex items-center text-(--text-accent-b-intense)">
                                        <Check className="h-4 w-4" aria-hidden />
                                    </DropdownMenu.ItemIndicator>
                                    <span>{option.label}</span>
                                </DropdownMenu.RadioItem>
                            ))}
                        </DropdownMenu.RadioGroup>
                    </DropdownMenu.Content>
                </DropdownMenu.Portal>
            </DropdownMenu.Root>
        </div>
    );
}

export default SidebarSelect;
