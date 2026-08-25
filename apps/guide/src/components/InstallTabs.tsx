'use client';

import { CodeBlock, SegmentedControl, cn } from '@seedcord/ui';
import { useSyncExternalStore } from 'react';

import { MANAGERS, getManager, getServerManager, setManager, subscribe } from '#lib/packageManager';

import type { Manager } from '#lib/packageManager';
import type { ReactElement } from 'react';

const OPTIONS = MANAGERS.map((name) => ({ value: name, label: name }));

export interface InstallTabsProps {
    commands: Record<Manager, string>;
    html: Record<Manager, string | null>;
}

export function InstallTabs({ commands, html }: InstallTabsProps): ReactElement {
    const manager = useSyncExternalStore(subscribe, getManager, getServerManager);

    return (
        <CodeBlock
            representation={{ text: commands[manager], html: html[manager] }}
            label={
                <SegmentedControl
                    options={OPTIONS}
                    value={manager}
                    onChange={setManager}
                    size="sm"
                    aria-label="Package manager"
                    className={cn('border-0 bg-transparent')}
                />
            }
        />
    );
}
