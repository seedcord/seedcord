import { Box, Text } from 'ink';
import React from 'react';

import { ui } from '#ui/palette';
import { LogStore } from '#ui/stores/LogStore';

import { FilterChips } from './FilterChips';
import { FilterKeys } from './Hotkeys';

import type { LogFilters } from '#ui/devPrefs';
import type { FilterCursor } from '#ui/filterCursor';
import type { PanelFit } from '#ui/hooks/usePanelFit';
import type { ReactElement } from 'react';

export const NO_FILTER_ROOM = 'Need more room for filters.';

interface FilterPanelProps extends PanelFit {
    readonly filters: LogFilters;
    readonly cursor: FilterCursor;
}

// the chips keep their full height under the message so the next resize can measure them again
export function FilterPanel({ filters, cursor, panelRef, contentRef, fits }: FilterPanelProps): ReactElement {
    return (
        <Box ref={panelRef} flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
            {fits ? null : (
                <Box flexShrink={0}>
                    <Text color={ui.warn} bold wrap="truncate">
                        {NO_FILTER_ROOM}
                    </Text>
                </Box>
            )}
            <Box ref={contentRef} flexDirection="column" flexShrink={0}>
                <FilterChips channels={LogStore.instance.getChannels()} filters={filters} cursor={cursor} open />
                <Box marginTop={1}>
                    <FilterKeys direction="row" />
                </Box>
            </Box>
        </Box>
    );
}
