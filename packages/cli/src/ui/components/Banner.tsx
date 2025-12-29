import { formatFilePath } from '@seedcord/utils';
import chalk from 'chalk';
import { Box, Text } from 'ink';
import React from 'react';

import { accentA, accentB } from './shared';

import type { Config } from '@seedcord/types';
import type { ReactElement } from 'react';

interface BannerProps {
    config: Config | null;
}

export function Banner({ config }: BannerProps): ReactElement {
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
                        <Text color="blue">➜</Text> Interactions:{' '}
                        {chalk.dim(formatFilePath(config.bot.interactions.path))}
                    </Text>
                    <Text>
                        <Text color="blue">➜</Text> Events: {chalk.dim(formatFilePath(config.bot.events.path))}
                    </Text>
                </Box>
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
