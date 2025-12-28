import { LoggerChannelRegistry } from '@seedcord/services';
import chalk from 'chalk';
import { Box, Text } from 'ink';
import React, { useState } from 'react';

import { accentA, accentB } from './shared';

import type { Config } from '@seedcord/types';
import type { ReactElement } from 'react';

interface BannerProps {
    config: Config | null;
}

export function Banner({ config }: BannerProps): ReactElement {
    const [logPath] = useState(() => LoggerChannelRegistry.instance.getLogFilePath('default'));

    return (
        <Box flexDirection="column" paddingBottom={1}>
            <Text>
                {accentA('seed')}
                {accentB('cord')}
            </Text>
            <Text></Text>
            {config && (
                <Box flexDirection="column" paddingBottom={1}>
                    <Text>
                        <Text color="blue">➜</Text> Interactions: {chalk.dim(config.bot.interactions.path)}
                    </Text>
                    <Text>
                        <Text color="blue">➜</Text> Events: {chalk.dim(config.bot.events.path)}
                    </Text>
                </Box>
            )}
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
