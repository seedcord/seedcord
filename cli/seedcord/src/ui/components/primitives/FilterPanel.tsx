import { Box } from 'ink';
import React from 'react';

import { LogStore } from '#ui/stores/LogStore';

import { FilterChips } from './FilterChips';
import { FilterKeys } from './Hotkeys';

import type { LogFilters } from '#ui/devPrefs';
import type { FilterCursor } from '#ui/filterCursor';
import type { ReactElement } from 'react';

interface FilterPanelProps {
    readonly filters: LogFilters;
    readonly cursor: FilterCursor;
}

export function FilterPanel({ filters, cursor }: FilterPanelProps): ReactElement {
    return (
        <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
            <FilterChips channels={LogStore.instance.getChannels()} filters={filters} cursor={cursor} open />
            <Box marginTop={1}>
                <FilterKeys direction="row" />
            </Box>
        </Box>
    );
}
