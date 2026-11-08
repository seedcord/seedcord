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
import { FilterKeys, FiltersKey, SessionKeys, ViewKeys } from './Hotkeys';
import { Rule } from './Rule';

import type { TunnelStatus } from '#commands/dev/tunnel/TunnelCoordinator';
import type { LogFilters } from '#ui/devPrefs';
import type { FilterCursor } from '#ui/filterCursor';
import type { DetailMode } from '#ui/LogLayout';
import type { FilterView } from '#ui/Screen';
import type { DevState, DevTransport } from '#ui/stores/DevStore';
import type { DOMElement } from 'ink';
import type { ReactElement, Ref } from 'react';

const MAX_RAIL = 40;

// the widest label is 'gateway' at 7
const META_LABEL_WIDTH = 8;

const LOG_DIR = 'logs/'; // the dev default writes one combined file into this folder

export interface SidebarProps {
    readonly state: DevState;
    readonly filters: LogFilters;
    readonly uptimeMs: number | null;
    readonly following: boolean;
    readonly interactive: boolean;
    readonly cursor: FilterCursor;
    readonly width: number | null;
    readonly view: FilterView;
    readonly details: DetailMode;
    readonly ref?: Ref<DOMElement>;
}

type RailKeysProps = Pick<SidebarProps, 'view' | 'state' | 'interactive' | 'following' | 'details'>;

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

function portValue(port: number | false): string {
    return port === false ? 'off' : String(port);
}

function transportLabel({ name }: DevTransport): string {
    return name.replace('@seedcord/', '');
}

interface StatusFact {
    readonly label: string;
    readonly value: string;
}

export function statusFacts(state: DevState, uptimeMs: number | null, withTarget: boolean): StatusFact[] {
    const { transport, port, tunnel } = state;
    const facts: (StatusFact | null)[] = [
        transport === null
            ? null
            : {
                  label: transportLabel(transport),
                  value: withTarget ? `v${transport.version} · ${transport.target}` : `v${transport.version}`
              },
        uptimeMs === null ? null : { label: 'up', value: formatUptime(uptimeMs) },
        // only the http host reports one
        port === null ? null : { label: 'port', value: portValue(port) },
        tunnel === null ? null : { label: 'tunnel', value: tunnelValue(tunnel) },
        { label: 'logs', value: LOG_DIR }
    ];
    return facts.filter((fact) => fact !== null);
}

interface StatusBlockProps {
    readonly state: DevState;
    readonly uptimeMs: number | null;
    readonly withTarget: boolean;
}

export function StatusBlock({ state, uptimeMs, withTarget }: StatusBlockProps): ReactElement {
    return (
        <Box flexDirection="column">
            <StatusBadge phase={state.phase} animate={state.idleAnimation} />
            {state.status ? <Text wrap="truncate">{state.status}</Text> : null}
            {statusFacts(state, uptimeMs, withTarget).map((fact) => (
                <Meta key={fact.label} label={fact.label} value={fact.value} />
            ))}
        </Box>
    );
}

function RailKeys({ view, state, interactive, following, details }: RailKeysProps): ReactElement {
    return (
        <Box flexShrink={0} marginTop={1} flexDirection="column">
            {view === 'collapsed' ? <FiltersKey shown={false} /> : <FilterKeys />}
            {view === 'always' ? <Rule /> : null}
            {view === 'shown' ? (
                <FiltersKey shown />
            ) : (
                <>
                    <SessionKeys state={state} interactive={interactive} following={following} />
                    <ViewKeys details={details} />
                </>
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
    details,
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
                    <StatusBlock state={state} uptimeMs={uptimeMs} withTarget />
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
            <RailKeys view={view} state={state} interactive={interactive} following={following} details={details} />
            <LiveFooter state={state} />
        </Box>
    );
}

export function LiveFooter({ state }: { readonly state: DevState }): ReactElement {
    return (
        <>
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
        </>
    );
}
