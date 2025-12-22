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
                            'border-border/80 shadow-soft flex w-full items-center justify-between rounded-lg border bg-[color-mix(in_oklab,var(--bg)_96%,var(--surface)_4%)] px-3 py-2 text-sm font-medium text-(--text) transition duration-0',
                            'focus:border-[color-mix(in_oklab,var(--accent-b)_55%,var(--border))] focus:bg-[color-mix(in_oklab,var(--bg)_94%,var(--accent-b)_10%)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--accent-b)_32%,transparent)] focus:ring-offset-2 focus:ring-offset-[color-mix(in_oklab,var(--bg)_96%,transparent)] focus:outline-none',
                            open
                                ? 'border-[color-mix(in_oklab,var(--accent-b)_62%,var(--border))] bg-[color-mix(in_oklab,var(--bg)_90%,var(--accent-b)_18%)] shadow-[0_10px_35px_-20px_color-mix(in_oklab,var(--accent-b)_45%,transparent)]'
                                : null
                        )}
                    >
                        <span className="truncate">{selectedLabel}</span>
                        <ChevronDown
                            className={cn(
                                'text-subtle h-4 w-4 transition-transform duration-200',
                                open
                                    ? 'rotate-180 text-[color-mix(in_oklab,var(--text)_85%,var(--accent-b)_15%)]'
                                    : null
                            )}
                            aria-hidden
                        />
                    </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                    <DropdownMenu.Content
                        align="start"
                        sideOffset={8}
                        className="border-border/80 z-70 w-(--radix-dropdown-menu-trigger-width) min-w-[220px] overflow-hidden rounded-lg border bg-[color-mix(in_oklab,var(--bg)_96%,#070917_4%)] p-1 shadow-[0_18px_36px_-16px_color-mix(in_oklab,var(--text)_32%,transparent)] transition-colors duration-200"
                    >
                        <DropdownMenu.RadioGroup value={value} onValueChange={handleValueChange}>
                            {options.map((option) => (
                                <DropdownMenu.RadioItem
                                    key={option.id}
                                    value={option.id}
                                    className="relative flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-(--text) transition-colors duration-200 outline-none select-none data-highlighted:bg-[color-mix(in_oklab,var(--accent-b)_12%,var(--bg)_88%)] data-highlighted:text-[color-mix(in_oklab,var(--text)_88%,var(--accent-b)_12%)] data-[state=checked]:border data-[state=checked]:border-[color-mix(in_oklab,var(--accent-b)_34%,var(--border))] data-[state=checked]:bg-[color-mix(in_oklab,var(--accent-b)_24%,var(--bg)_76%)] data-[state=checked]:font-semibold data-[state=checked]:text-[color-mix(in_oklab,var(--text)_85%,var(--accent-b)_15%)]"
                                >
                                    <DropdownMenu.ItemIndicator className="absolute right-3 flex items-center text-[color-mix(in_oklab,var(--accent-b)_78%,var(--text))]">
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
