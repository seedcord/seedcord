import { Box, Text } from 'ink';
import React from 'react';

import { channelColor } from '@ui/channelColor';
import { LogStore } from '@ui/stores/LogStore';

import type { ReactElement } from 'react';

interface ChannelTogglesProps {
    // Empty set means every channel is on, so channels that appear later default to visible.
    readonly enabled: ReadonlySet<string>;
    // Index of the focused row while in toggle mode, or null when the list is read-only.
    readonly cursor: number | null;
}

export function ChannelToggles({ enabled, cursor }: ChannelTogglesProps): ReactElement {
    // Re-read each render; the tree re-renders on every log batch, so no memo is needed.
    const channels = LogStore.instance.getChannels();

    if (channels.length === 0) {
        return <Text dimColor>no logs yet</Text>;
    }

    return (
        <Box flexDirection="column">
            {channels.map((channel, index) => {
                const on = enabled.size === 0 || enabled.has(channel);
                const focused = cursor === index;
                // Match the per-line log tag color when on, so the toggle and its log lines visually pair up.
                const color = focused ? 'cyan' : on ? channelColor(channel) : 'gray';
                return (
                    <Text key={channel} color={color} wrap="truncate">
                        {focused ? '❯ ' : '  '}
                        {on ? '●' : '○'} {channel}
                    </Text>
                );
            })}
        </Box>
    );
}
