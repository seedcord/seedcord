'use client';

import { CodeBlock, SegmentedControl, cn, type SegmentedControlOption } from '@seedcord/ui';
import { useMemo, useState } from 'react';

import type { ReactElement } from 'react';

interface CommandTab {
    id: string;
    label: string;
    html: string | null;
    code: string;
}

interface InstallCommandTabsProps {
    commands: readonly CommandTab[];
}

function InstallCommandTabs({ commands }: InstallCommandTabsProps): ReactElement | null {
    const [selectedId, setSelectedId] = useState(commands[0]?.id);

    // derive in render so a stale selectedId (no longer in commands) falls back to commands[0]
    const activeCommand = commands.find((command) => command.id === selectedId) ?? commands[0];
    const activeId = activeCommand?.id;

    const options = useMemo<SegmentedControlOption<string>[]>(
        () => commands.map((command) => ({ value: command.id, label: command.label })),
        [commands]
    );

    if (!activeCommand || activeId === undefined) {
        return null;
    }

    return (
        <div className={cn('space-y-3')}>
            <SegmentedControl
                options={options}
                value={activeId}
                onChange={setSelectedId}
                size="sm"
                aria-label="Install command"
            />
            <CodeBlock
                representation={{ html: activeCommand.html, text: activeCommand.code }}
                label={activeCommand.label}
            />
        </div>
    );
}

export default InstallCommandTabs;
