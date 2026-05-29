'use client';

import { Dropdown, cn } from '@seedcord/ui';
import { useMemo } from 'react';

import type { DropdownOption } from '@seedcord/ui';
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
    const dropdownOptions = useMemo<DropdownOption[]>(
        () => options.map((option) => ({ value: option.id, label: option.label })),
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
                options={dropdownOptions}
                onChange={onChange}
            />
        </div>
    );
}

export default SidebarSelect;
