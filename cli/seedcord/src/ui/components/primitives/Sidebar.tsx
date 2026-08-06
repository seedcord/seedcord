import { Box, Text } from 'ink';
import React from 'react';

import { formatUptime } from '@ui/format';
import { isStreaming } from '@ui/stores/devPhase';
import { LogStore } from '@ui/stores/LogStore';

import { Banner } from '../Banner';
import { StatusBadge } from '../StatusBadge';
import { BlinkDot } from './BlinkDot';
import { FilterChips } from './FilterChips';
import { FilterKeys, SessionKeys } from './Hotkeys';
import { Rule } from './Rule';

import type { TunnelStatus } from '@commands/dev/tunnel/TunnelCoordinator';
import type { LogLevel } from '@seedcord/logger';
import type { FilterCursor } from '@ui/filterCursor';
import type { DevState } from '@ui/stores/DevStore';
import type { DOMElement } from 'ink';
import type { ReactElement, Ref } from 'react';

export const MAX_RAIL = 40;

const META_LABEL_WIDTH = 7;

const LOG_DIR = 'logs/'; // the dev default writes one combined file into this folder

interface SidebarProps {
    readonly state: DevState;
    readonly enabled: ReadonlySet<string>;
    readonly enabledLevels: ReadonlySet<LogLevel>;
    readonly uptimeMs: number | null;
    readonly following: boolean;
    readonly interactive: boolean;
    readonly cursor: FilterCursor;
    readonly width: number | null;
    readonly filtersOpen: boolean;
    readonly ref?: Ref<DOMElement>;
}

function Meta({ label, value }: { label: string; value: string }): ReactElement {
    return (
        <Text>
            <Text dimColor>{label.padEnd(META_LABEL_WIDTH)}</Text>
            {value}
        </Text>
    );
}

function tunnelValue(status: TunnelStatus): string {
    return status === 'live' || status === 'lost' ? status : `${status}…`;
}

function StatusBlock({ state, uptimeMs }: { state: DevState; uptimeMs: number | null }): ReactElement {
    return (
        <Box flexDirection="column">
            <StatusBadge phase={state.phase} />
            {state.status ? <Text>{state.status}</Text> : null}
            {uptimeMs === null ? null : <Meta label="up" value={formatUptime(uptimeMs)} />}
            {/* only the http host reports a port */}
            {state.port === null ? null : <Meta label="port" value={String(state.port)} />}
            {state.tunnel === null ? null : <Meta label="tunnel" value={tunnelValue(state.tunnel)} />}
            <Meta label="logs" value={LOG_DIR} />
        </Box>
    );
}

// flexShrink={0} on every section holds its natural height. A short terminal overlaps rows without it
export function Sidebar({
    state,
    enabled,
    enabledLevels,
    uptimeMs,
    following,
    interactive,
    cursor,
    width,
    filtersOpen,
    ref
}: SidebarProps): ReactElement {
    return (
        <Box
            ref={ref}
            flexDirection="column"
            width={width ?? undefined}
            maxWidth={MAX_RAIL}
            flexShrink={0}
            paddingX={1}
            overflow="hidden"
        >
            <Box flexShrink={0}>
                <Banner version={state.frameworkVersion} />
            </Box>
            <Box flexShrink={0} marginTop={1}>
                <StatusBlock state={state} uptimeMs={uptimeMs} />
            </Box>
            <Box flexShrink={0} marginTop={1} flexDirection="column">
                <FilterChips
                    channels={LogStore.instance.getChannels()}
                    enabledChannels={enabled}
                    enabledLevels={enabledLevels}
                    cursor={cursor}
                    open={filtersOpen}
                />
            </Box>
            {filtersOpen ? (
                <Box flexShrink={0} marginTop={1} flexDirection="column">
                    <FilterKeys />
                    <Rule />
                </Box>
            ) : null}
            {/* the rule already separates the two key groups, so the blank row is only for the collapsed form */}
            <Box flexShrink={0} marginTop={filtersOpen ? 0 : 1}>
                <SessionKeys phase={state.phase} interactive={interactive} following={following} />
            </Box>
            <Box flexGrow={1} />
            <Box flexShrink={0} justifyContent="flex-end">
                {isStreaming(state.phase) ? (
                    <Text>
                        <BlinkDot />
                        <Text dimColor> live</Text>
                    </Text>
                ) : (
                    <Text dimColor>○ idle</Text>
                )}
            </Box>
        </Box>
    );
}
