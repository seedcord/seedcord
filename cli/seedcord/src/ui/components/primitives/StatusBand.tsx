import { Box, Text } from 'ink';
import React from 'react';

import { DetailsKey, RailKey } from './Hotkeys';
import { statusFacts } from './Sidebar';
import { BrandStatus, KeySlot, PendingKey } from './StatusLine';

import type { DetailMode } from '#ui/LogLayout';
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
    readonly details: DetailMode;
}

function infoRow(state: DevState, uptimeMs: number | null, filtered: boolean): string {
    const facts = statusFacts(state, uptimeMs, false).map(({ label, value }) => `${label} ${value}`);
    return [...facts, ...(filtered ? ['filtered'] : [])].join(' · ');
}

export function StatusBand(props: StatusBandProps): ReactElement {
    const { state, notices, uptimeMs, filtered, filtersShown, canToggleRail, details } = props;
    return (
        <Box flexDirection="column" flexShrink={0} paddingX={1}>
            <Box justifyContent="space-between">
                <Box flexShrink={1} overflow="hidden">
                    <Text wrap="truncate">
                        <BrandStatus state={state} />
                        {state.status ? <Text dimColor> · {state.status}</Text> : null}
                    </Text>
                </Box>
                <Box flexShrink={0}>
                    {canToggleRail ? (
                        <KeySlot>
                            <RailKey shown={false} />
                        </KeySlot>
                    ) : null}
                    <KeySlot>
                        <DetailsKey mode={details} />
                    </KeySlot>
                </Box>
            </Box>
            <Box justifyContent="space-between">
                <Box flexShrink={1} overflow="hidden">
                    <Text dimColor wrap="truncate">
                        {infoRow(state, uptimeMs, filtered)}
                    </Text>
                </Box>
                <PendingKey top={notices[0]} filtersShown={filtersShown} />
            </Box>
        </Box>
    );
}
