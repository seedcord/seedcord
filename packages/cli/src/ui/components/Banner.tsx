import { LoggerChannelRegistry } from '@seedcord/services';
import chalk from 'chalk';
import { Box, Text } from 'ink';
import React, { useState } from 'react';

import type { ReactElement } from 'react';

export function Banner(): ReactElement {
    const accentA = chalk.hex('f04e36').bold;
    const accentB = chalk.hex('6fab49').bold;
    const helpLine = chalk.dim('Press ') + chalk.reset.bold.white('h') + chalk.reset.dim(' to show help');

    const [logPath] = useState(() => LoggerChannelRegistry.instance.getLogFilePath('default'));

    return (
        <Box flexDirection="column" paddingBottom={1}>
            <Text>
                {accentA('seed')}
                {accentB('cord')}
            </Text>
            <Text></Text>
            {logPath && (
                <Text>
                    <Text color="green">➜</Text> Logs: {chalk.dim(logPath)}
                </Text>
            )}
            <Text>
                <Text color="green">➜</Text> {helpLine}
            </Text>
        </Box>
    );
}
