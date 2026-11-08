import { Box } from 'ink';
import React from 'react';

import { Banner } from '#ui/components/Banner';

import { FiltersKey, SessionKeys, ViewKeys } from './Hotkeys';
import { LiveFooter, StatusBlock } from './Sidebar';

import type { SidebarProps } from './Sidebar';
import type { ReactElement } from 'react';

// the longest status row, 'tunnel  registering…', is 20 wide. paddingX adds 2.
const SLIM_RAIL_WIDTH = 22;

type SlimRailProps = Pick<SidebarProps, 'state' | 'uptimeMs' | 'following' | 'interactive' | 'view' | 'details'>;

// f opens the filters over the logs
export function SlimRail(props: SlimRailProps): ReactElement {
    const { state, uptimeMs, following, interactive, view, details } = props;
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
                <SessionKeys state={state} interactive={interactive} following={following} />
                <ViewKeys details={details} />
            </Box>
            <LiveFooter state={state} />
        </Box>
    );
}
