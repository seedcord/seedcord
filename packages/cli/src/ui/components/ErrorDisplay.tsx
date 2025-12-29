import { Box, Text } from 'ink';
import React from 'react';

import type { ReactElement } from 'react';

interface ErrorDisplayProps {
    readonly error: Error;
}

export function ErrorDisplay({ error }: ErrorDisplayProps): ReactElement {
    return (
        <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1}>
            <Box marginTop={-1}>
                <Text color="red" bold>
                    Error: {error.name}
                </Text>
            </Box>
            <Text>{error.message}</Text>
            {error.stack && (
                <Box marginTop={1}>
                    <Text dimColor>{error.stack}</Text>
                </Box>
            )}
        </Box>
    );
}
