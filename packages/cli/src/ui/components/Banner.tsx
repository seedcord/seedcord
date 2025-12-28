import { LoggerChannelRegistry } from '@seedcord/services';
import chalk from 'chalk';
import { Box, Text } from 'ink';
import React, { useState } from 'react';

import { accentA, accentB } from './shared';

import type { ReactElement } from 'react';

export function Banner(): ReactElement {
    const [logPath] = useState(() => LoggerChannelRegistry.instance.getLogFilePath('default'));

    return (
        <Box flexDirection="column" paddingBottom={1}>
            <Text>
                {accentA('seed')}
                {accentB('cord')}
            </Text>
            <Text></Text>
            {logPath && (
                <Text wrap="truncate">
                    <Text color="green">➜</Text> Logs: {chalk.dim(logPath)}
                </Text>
            )}
            <Text>
                <Text color="green">➜</Text>
                <Text color="gray"> Press </Text>
                <Text bold color="white">
                    h
                </Text>
                <Text color="gray"> to show help</Text>
            </Text>
        </Box>
    );
}
