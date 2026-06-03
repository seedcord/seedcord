import { Box, Text } from 'ink';
import React from 'react';

import type { ReactElement } from 'react';

const STACK_PREVIEW_LINES = 6;

interface ErrorDisplayProps {
    readonly error: Error;
}

export function ErrorDisplay({ error }: ErrorDisplayProps): ReactElement {
    // stack[0] repeats "Error: message" which we already render, so preview the frames below it.
    const frames = (error.stack?.split('\n') ?? []).slice(1);
    const preview = frames.slice(0, STACK_PREVIEW_LINES);
    const hidden = frames.length - preview.length;

    return (
        <Box flexDirection="column" borderStyle="round" borderColor="red" padding={1}>
            <Box marginTop={-1}>
                <Text color="red" bold>
                    Error: {error.name}
                </Text>
            </Box>
            <Text>{error.message}</Text>
            {preview.length > 0 && (
                <Box marginTop={1} flexDirection="column">
                    {preview.map((line) => (
                        <Text key={line} dimColor wrap="truncate">
                            {line}
                        </Text>
                    ))}
                    {hidden > 0 && <Text dimColor>{`… ${hidden} more line${hidden === 1 ? '' : 's'}`}</Text>}
                </Box>
            )}
            <Box marginTop={1}>
                <Text>
                    press{' '}
                    <Text color="yellow" bold>
                        r
                    </Text>{' '}
                    to restart
                </Text>
            </Box>
        </Box>
    );
}
