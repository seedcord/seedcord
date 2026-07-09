import { Box, Text } from 'ink';
import React from 'react';

import { formatUptime } from '@ui/format';

import { Banner } from '../Banner';
import { StatusBadge } from '../StatusBadge';
import { ChannelToggles } from './ChannelToggles';
import { HotkeyBar } from './HotkeyBar';

import type { DevState } from '@ui/stores/DevStore';
import type { DOMElement } from 'ink';
import type { ReactElement, Ref } from 'react';

const MAX_RAIL = 40;

const META_LABEL_WIDTH = 5;

// the dev default writes one combined file into this folder
const LOG_DIR = 'logs/';

interface SidebarProps {
    readonly state: DevState;
    readonly enabled: ReadonlySet<string>;
    readonly uptimeMs: number | null;
    readonly following: boolean;
    readonly interactive: boolean;
    readonly showToggles: boolean;
    readonly cursor: number;
    readonly width: number | null;
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

function StatusBlock({ state, uptimeMs }: { state: DevState; uptimeMs: number | null }): ReactElement {
    return (
        <Box flexDirection="column">
            <StatusBadge phase={state.phase} />
            {state.status ? <Text>{state.status}</Text> : null}
            {uptimeMs === null ? null : <Meta label="up" value={formatUptime(uptimeMs)} />}
            <Meta label="logs" value={LOG_DIR} />
        </Box>
    );
}

// flexShrink={0} on every section keeps each at its natural height, so a short terminal clips from the
// bottom instead of overlapping rows.
export function Sidebar({
    state,
    enabled,
    uptimeMs,
    following,
    interactive,
    showToggles,
    cursor,
    width,
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
                <Text bold color="blueBright">
                    channels
                </Text>
                <ChannelToggles enabled={enabled} cursor={showToggles ? cursor : null} />
            </Box>
            <Box flexShrink={0} marginTop={1}>
                <HotkeyBar
                    phase={state.phase}
                    interactive={interactive}
                    mode={showToggles ? 'toggles' : 'default'}
                    following={following}
                />
            </Box>
        </Box>
    );
}
