import { Box } from 'ink';
import React from 'react';

import { Banner } from '#ui/components/Banner';

import { FiltersKey, SessionKeys } from './Hotkeys';
import { LiveFooter, StatusBlock } from './Sidebar';

import type { FilterView } from '#ui/Screen';
import type { DevState } from '#ui/stores/DevStore';
import type { ReactElement } from 'react';

// the longest row is the status block's tunnel line, 'tunnel  opening…', plus the padding
export const SLIM_RAIL_WIDTH = 18;

interface SlimRailProps {
    readonly state: DevState;
    readonly uptimeMs: number | null;
    readonly following: boolean;
    readonly interactive: boolean;
    readonly view: FilterView;
}

// f opens the filters over the logs
export function SlimRail({ state, uptimeMs, following, interactive, view }: SlimRailProps): ReactElement {
    return (
        <Box flexDirection="column" width={SLIM_RAIL_WIDTH} flexShrink={0} paddingX={1} overflow="hidden">
            <Box flexShrink={0}>
                <Banner version={null} />
            </Box>
            <Box flexShrink={0} marginTop={1}>
                <StatusBlock state={state} uptimeMs={uptimeMs} withTarget={false} />
            </Box>
            <Box flexShrink={0} marginTop={1} flexDirection="column">
                <FiltersKey shown={view === 'shown'} />
                <SessionKeys
                    gate={{ state, interactive, filterView: view, canToggleRail: true }}
                    following={following}
                />
            </Box>
            <LiveFooter state={state} />
        </Box>
    );
}
