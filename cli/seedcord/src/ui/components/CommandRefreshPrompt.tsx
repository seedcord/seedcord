import { Box, Text } from 'ink';
import React from 'react';

import { ui } from '#ui/palette';

import type { ReactElement } from 'react';

interface CommandRefreshPromptProps {
    files: string[];
}

export function CommandRefreshPrompt({ files }: CommandRefreshPromptProps): ReactElement {
    return (
        <Box borderStyle="round" borderColor={ui.warn} flexDirection="column" paddingX={1}>
            <Text>
                <Text color={ui.warn} bold>
                    Commands updated:
                </Text>
            </Text>
            {files.map((file) => (
                <Text key={file} color={ui.accent}>
                    - {file}
                </Text>
            ))}
            <Text>Refresh commands? (y/n)</Text>
        </Box>
    );
}
