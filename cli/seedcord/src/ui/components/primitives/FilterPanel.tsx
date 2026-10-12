import { Box } from 'ink';
import React from 'react';

import { LogStore } from '#ui/stores/LogStore';

import { FilterChips } from './FilterChips';
import { FilterKeys } from './Hotkeys';

import type { FilterCursor } from '#ui/filterCursor';
import type { LogLevel } from '@seedcord/types';
import type { ReactElement } from 'react';

interface FilterPanelProps {
    readonly enabled: ReadonlySet<string>;
    readonly enabledLevels: ReadonlySet<LogLevel>;
    readonly cursor: FilterCursor;
}

export function FilterPanel({ enabled, enabledLevels, cursor }: FilterPanelProps): ReactElement {
    return (
        <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
            <FilterChips
                channels={LogStore.instance.getChannels()}
                enabledChannels={enabled}
                enabledLevels={enabledLevels}
                cursor={cursor}
                open
            />
            <Box marginTop={1}>
                <FilterKeys direction="row" />
            </Box>
        </Box>
    );
}
