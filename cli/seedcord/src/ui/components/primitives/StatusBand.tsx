import { Box, Text } from 'ink';
import React from 'react';

import { formatUptime } from '#ui/format';

import { RailKey } from './Hotkeys';
import { LOG_DIR, transportLabel, tunnelValue } from './Sidebar';
import { BrandStatus, KeySlot, PendingKey } from './StatusLine';

import type { Notice } from '#ui/notices';
import type { DevState } from '#ui/stores/DevStore';
import type { ReactElement } from 'react';

interface StatusBandProps {
    readonly state: DevState;
    readonly notices: readonly Notice[];
    readonly uptimeMs: number | null;
    readonly filtered: boolean;
    readonly filtersShown: boolean;
    readonly canToggleRail: boolean;
}

function details(state: DevState, uptimeMs: number | null, filtered: boolean): string {
    const { transport, port, tunnel } = state;
    return [
        transport === null ? null : `${transportLabel(transport)} v${transport.version}`,
        uptimeMs === null ? null : `up ${formatUptime(uptimeMs)}`,
        port === null ? null : `port ${String(port)}`,
        tunnel === null ? null : `tunnel ${tunnelValue(tunnel)}`,
        LOG_DIR,
        filtered ? 'filtered' : null
    ]
        .filter((part) => part !== null)
        .join(' · ');
}

export function StatusBand(props: StatusBandProps): ReactElement {
    const { state, notices, uptimeMs, filtered, filtersShown, canToggleRail } = props;
    return (
        <Box flexDirection="column" flexShrink={0} paddingX={1}>
            <Box justifyContent="space-between">
                <Box flexShrink={1} overflow="hidden">
                    <Text wrap="truncate">
                        <BrandStatus state={state} />
                        {state.status ? <Text dimColor> · {state.status}</Text> : null}
                    </Text>
                </Box>
                {canToggleRail ? (
                    <KeySlot>
                        <RailKey shown={false} />
                    </KeySlot>
                ) : null}
            </Box>
            <Box justifyContent="space-between">
                <Box flexShrink={1} overflow="hidden">
                    <Text dimColor wrap="truncate">
                        {details(state, uptimeMs, filtered)}
                    </Text>
                </Box>
                <PendingKey top={notices[0]} filtersShown={filtersShown} />
            </Box>
        </Box>
    );
}
