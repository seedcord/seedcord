import { Box, Text } from 'ink';
import React from 'react';

import { version } from '#core/version';
import { Banner } from '#ui/components/Banner';
import { StatusBadge } from '#ui/components/StatusBadge';
import { formatUptime } from '#ui/format';
import { isStreaming } from '#ui/stores/devPhase';
import { LogStore } from '#ui/stores/LogStore';

import { BlinkDot } from './BlinkDot';
import { FilterChips } from './FilterChips';
import { FilterKeys, FiltersKey, SessionKeys } from './Hotkeys';
import { Rule } from './Rule';

import type { TunnelStatus } from '#commands/dev/tunnel/TunnelCoordinator';
import type { LogFilters } from '#ui/devPrefs';
import type { FilterCursor } from '#ui/filterCursor';
import type { FilterView } from '#ui/hooks/useFilters';
import type { DevState, DevTransport } from '#ui/stores/DevStore';
import type { DOMElement } from 'ink';
import type { ReactElement, Ref } from 'react';

export const MAX_RAIL = 40;

// the widest label is 'gateway' at 7
const META_LABEL_WIDTH = 8;

const LOG_DIR = 'logs/'; // the dev default writes one combined file into this folder

interface SidebarProps {
    readonly state: DevState;
    readonly filters: LogFilters;
    readonly uptimeMs: number | null;
    readonly following: boolean;
    readonly interactive: boolean;
    readonly cursor: FilterCursor;
    readonly width: number | null;
    readonly view: FilterView;
    readonly ref?: Ref<DOMElement>;
}

interface RailKeysProps {
    readonly view: FilterView;
    readonly state: DevState;
    readonly interactive: boolean;
    readonly following: boolean;
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

function transportLabel({ name }: DevTransport): string {
    return name.replace('@seedcord/', '');
}

function StatusBlock({ state, uptimeMs }: { state: DevState; uptimeMs: number | null }): ReactElement {
    return (
        <Box flexDirection="column">
            <StatusBadge phase={state.phase} animate={state.idleAnimation} />
            {state.status ? <Text>{state.status}</Text> : null}
            {state.transport === null ? null : (
                <Meta
                    label={transportLabel(state.transport)}
                    value={`v${state.transport.version} · ${state.transport.target}`}
                />
            )}
            {uptimeMs === null ? null : <Meta label="up" value={formatUptime(uptimeMs)} />}
            {/* only the http host reports a port */}
            {state.port === null ? null : <Meta label="port" value={String(state.port)} />}
            {state.tunnel === null ? null : <Meta label="tunnel" value={tunnelValue(state.tunnel)} />}
            <Meta label="logs" value={LOG_DIR} />
        </Box>
    );
}

function RailKeys({ view, state, interactive, following }: RailKeysProps): ReactElement {
    return (
        <Box flexShrink={0} marginTop={1} flexDirection="column">
            {view === 'collapsed' ? <FiltersKey shown={false} /> : <FilterKeys />}
            {view === 'always' ? <Rule /> : null}
            {view === 'shown' ? (
                <FiltersKey shown />
            ) : (
                <SessionKeys phase={state.phase} interactive={interactive} following={following} />
            )}
        </Box>
    );
}

// flexShrink={0} on every section holds its natural height, a short terminal overlaps rows without it
export function Sidebar({
    state,
    filters,
    uptimeMs,
    following,
    interactive,
    cursor,
    width,
    view,
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
                <Banner version={version} />
            </Box>
            {/* compact has no room for the status beside the open chips */}
            {view === 'shown' ? null : (
                <Box flexShrink={0} marginTop={1}>
                    <StatusBlock state={state} uptimeMs={uptimeMs} />
                </Box>
            )}
            <Box flexShrink={0} marginTop={1} flexDirection="column">
                <FilterChips
                    channels={LogStore.instance.getChannels()}
                    filters={filters}
                    cursor={cursor}
                    open={view !== 'collapsed'}
                />
            </Box>
            <RailKeys view={view} state={state} interactive={interactive} following={following} />
            <Box flexGrow={1} />
            <Box flexShrink={0} justifyContent="flex-end">
                {isStreaming(state.phase) ? (
                    <Text>
                        <BlinkDot animate={state.idleAnimation} />
                        <Text dimColor> live</Text>
                    </Text>
                ) : (
                    <Text dimColor>○ idle</Text>
                )}
            </Box>
        </Box>
    );
}
