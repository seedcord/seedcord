'use client';

import { Dropdown, cn, useMobilePanelContainer } from '@seedcord/ui';
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
    // on mobile this is the drawer's content node so the dropdown portals there and anchors to its trigger.
    // on desktop it's null, so dropdowns fall back to document.body.
    const panelContainer = useMobilePanelContainer();
    const dropdownOptions = useMemo<DropdownOption[]>(
        () => (options ?? []).map((option) => ({ value: option.id, label: option.label })),
        [options]
    );

    return (
        <div className={cn('space-y-1')}>
            <span id={labelId} className={cn('text-subtle block text-xs font-semibold tracking-wide uppercase')}>
                {label}
            </span>
            <Dropdown
                id={id}
                aria-labelledby={labelId}
                placeholderLabel={label}
                value={value}
                onChange={onChange}
                container={panelContainer}
                {...(groups ? { groups } : { options: dropdownOptions })}
            />
        </div>
    );
}
