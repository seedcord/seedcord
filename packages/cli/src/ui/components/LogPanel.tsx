import { LoggerChannelRegistry } from '@seedcord/services';
import { formatFilePath } from '@seedcord/utils';
import { Box, Text } from 'ink';
import React, { useState } from 'react';

import { useLogs } from '@ui/hooks/useLogs';

import type { ReactElement } from 'react';

interface LogPanelProps {
    readonly channel?: string | undefined;
    readonly height?: number;
}

export function LogPanel({ channel, height = 10 }: LogPanelProps): ReactElement {
    const logs = useLogs(channel);
    const visibleLogs = logs.slice(-height);
    const [logPath] = useState(() => LoggerChannelRegistry.instance.getLogFilePath(channel ?? 'default'));

    const mainTitle = channel ? `Logs · ${channel}` : 'Logs · all';
    const pathTitle = channel
        ? logPath
            ? `(${formatFilePath(logPath)})`
            : ''
        : logPath
          ? formatFilePath(logPath, { onlyDir: true })
          : 'no log file';

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="gray" flexGrow={1}>
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
                    <Text dimColor>Waiting for logs…</Text>
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
