import { Box, Text } from 'ink';
import React from 'react';

import { channelColor } from '@ui/channelColor';
import { LogStore } from '@ui/stores/LogStore';

import type { LogEntry } from '@ui/stores/LogStore';
import type { ReactElement } from 'react';

const MIN_LOG_LINES = 3;
const MAX_TAG = 10;

interface ScrollableLogViewProps {
    readonly visible: readonly LogEntry[];
    readonly viewportHeight: number;
    // False until the parent box has been measured; avoids a one-frame "too small" flash on mount.
    readonly measured: boolean;
}

export function ScrollableLogView({ visible, viewportHeight, measured }: ScrollableLogViewProps): ReactElement | null {
    if (!measured) return null;

    if (viewportHeight < MIN_LOG_LINES) {
        return (
            <Text color="yellow" wrap="truncate">
                Terminal too small to show logs.
            </Text>
        );
    }

    // Pad channel tags to a common width so messages line up; cap the width so a long channel name is
    // truncated rather than the message.
    const channels = LogStore.instance.getChannels();
    const tagWidth = Math.min(
        MAX_TAG,
        channels.reduce((max, channel) => Math.max(max, channel.length), 0)
    );

    return (
        // flex-end pins the newest line to the bottom edge (tail -f): the window grows upward, and when the
        // buffer is sparse the lines sit at the bottom instead of the middle.
        <Box flexDirection="column" flexGrow={1} justifyContent="flex-end" overflow="hidden">
            {visible.length === 0 ? (
                <Text dimColor>Waiting for logs…</Text>
            ) : (
                visible.map((log) => (
                    <Text key={log.id} wrap="truncate">
                        <Text color={channelColor(log.channel)}>{log.channel.slice(0, tagWidth).padEnd(tagWidth)}</Text>{' '}
                        {log.text}
                    </Text>
                ))
            )}
        </Box>
    );
}
