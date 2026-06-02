'use client';

import { Dropdown, cn } from '@seedcord/ui';
import { useMemo } from 'react';

import type { DropdownGroup, DropdownOption } from '@seedcord/ui';
import type { ReactElement } from 'react';

interface SidebarSelectOption {
    id: string;
    label: string;
}

interface SidebarSelectProps {
    id: string;
    label: string;
    value: string;
    options?: readonly SidebarSelectOption[];
    groups?: readonly DropdownGroup[];
    onChange: (value: string) => void;
}

export function SidebarSelect({ id, label, value, options, groups, onChange }: SidebarSelectProps): ReactElement {
    const labelId = `${id}-label`;
    const dropdownOptions = useMemo<DropdownOption[]>(
        () => (options ?? []).map((option) => ({ value: option.id, label: option.label })),
        [options]
    );

    return (
        <div className={cn('space-y-1')}>
            <label
                id={labelId}
                className={cn('text-subtle text-xs font-semibold tracking-wide uppercase')}
                htmlFor={id}
            >
                {label}
            </label>
            <Dropdown
                id={id}
                aria-labelledby={labelId}
                placeholderLabel={label}
                value={value}
                onChange={onChange}
                {...(groups ? { groups } : { options: dropdownOptions })}
            />
        </div>
    );
}
