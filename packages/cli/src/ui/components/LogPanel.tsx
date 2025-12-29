import { LoggerChannelRegistry } from '@seedcord/services';
import { formatFilePath } from '@seedcord/utils';
import { Box, Text } from 'ink';
import React, { useState } from 'react';

import { useLogs } from '@ui/hooks/useLogs';

import type { ReactElement } from 'react';

interface LogPanelProps {
    readonly channel?: string | undefined;
    readonly title?: string;
    readonly height?: number;
    readonly borderColor?: string;
}

export function LogPanel({ channel, title = 'Logs', height = 10, borderColor = 'gray' }: LogPanelProps): ReactElement {
    const logs = useLogs(channel);
    const visibleLogs = logs.slice(-height);
    const [logPath] = useState(() => LoggerChannelRegistry.instance.getLogFilePath(channel ?? 'default'));

    const mainTitle = channel ? `${title} - ${channel}` : title;
    const pathTitle = logPath
        ? channel
            ? `(${formatFilePath(logPath)})`
            : formatFilePath(logPath, { onlyDir: true })
        : channel
          ? ''
          : 'no log file';

    return (
        <Box flexDirection="column" borderStyle="round" borderColor={borderColor} height={height + 2}>
            <Box marginTop={-1} marginLeft={1}>
                <Text bold wrap="truncate">
                    {' '}
                    {mainTitle}
                </Text>
                {pathTitle ? (
                    <Text dimColor wrap="truncate">
                        {' '}
                        {pathTitle}{' '}
                    </Text>
                ) : null}
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
