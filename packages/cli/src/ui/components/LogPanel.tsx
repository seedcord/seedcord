import { Box, Text } from 'ink';
import React from 'react';

import { useLogs } from '@ui/hooks/useLogs';

import type { ReactElement } from 'react';

interface LogPanelProps {
    readonly channel?: string;
    readonly title?: string;
    readonly height?: number;
    readonly borderColor?: string;
}

export function LogPanel({ channel, title = 'Logs', height = 10, borderColor = 'gray' }: LogPanelProps): ReactElement {
    const logs = useLogs(channel);
    const visibleLogs = logs.slice(-height);
    const displayTitle = channel ? `${title} - ${channel}` : title;

    return (
        <Box flexDirection="column" borderStyle="round" borderColor={borderColor} height={height + 2}>
            <Box marginTop={-1} marginLeft={1}>
                <Text bold> {displayTitle} </Text>
            </Box>
            <Box flexDirection="column" flexGrow={1} overflow="hidden">
                {visibleLogs.length === 0 ? (
                    <Text dimColor>Waiting for logs...</Text>
                ) : (
                    visibleLogs.map((log) => (
                        <Text key={log.id} wrap="truncate">
                            {log.text}
                        </Text>
                    ))
                )}
            </Box>
        </Box>
    );
}
