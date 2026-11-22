'use client';

import { CodeBlock, SegmentedControl, cn, localItems, useStoredItem } from '@seedcord/ui';

import { MANAGERS, MANAGER_STORAGE_KEY, managerFrom } from '#lib/packageManager';

import type { Manager } from '#lib/packageManager';
import type { ReactElement } from 'react';

const OPTIONS = MANAGERS.map((name) => ({ value: name, label: name }));

export interface ShellTabsProps {
    commands: Record<Manager, string>;
    html: Record<Manager, string | null>;
}

export function ShellTabs({ commands, html }: ShellTabsProps): ReactElement {
    const manager = managerFrom(useStoredItem(localItems, MANAGER_STORAGE_KEY));

    return (
        <CodeBlock
            representation={{ text: commands[manager], html: html[manager] }}
            label={
                <SegmentedControl
                    options={OPTIONS}
                    value={manager}
                    onChange={(next) => localItems.write(MANAGER_STORAGE_KEY, next)}
                    size="sm"
                    aria-label="Package manager"
                    className={cn('border-0 bg-transparent')}
                />
            }
        />
    );
}
