import chalk from 'chalk';
import { Box, Text } from 'ink';
import React from 'react';

import type { ReactElement } from 'react';

export function Banner(): ReactElement {
    const accent = chalk.hex('#646cff');
    const accentA = chalk.hex('f04e36').bold;
    const accentB = chalk.hex('6fab49').bold;
    const dim = chalk.dim;

    return (
        <Box flexDirection="column" paddingBottom={1}>
            <Text>
                {accentA('seed')}
                {accentB('cord')} <Text color="greenBright">ready in 1.24 s</Text>
            </Text>
            <Text></Text>
            <Text>
                <Text color="green">➜</Text> Local: {accent('http://localhost:5173/')}
            </Text>
            <Text>
                <Text color="green">➜</Text> Network: {accent('http://192.168.0.42:5173/')}
            </Text>
            <Text>
                <Text color="green">➜</Text> {dim('Press h to show help')}
            </Text>
        </Box>
    );
}
