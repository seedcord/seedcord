import { Box, Text } from 'ink';
import React from 'react';

import { ui } from '#ui/palette';

import type { ReactElement } from 'react';

export function QuitConfirmCard(): ReactElement {
    return (
        <Box borderStyle="round" borderColor={ui.warn} flexDirection="column" paddingX={1}>
            <Text color={ui.warn} bold>
                Quit?
            </Text>
            <Text>
                press{' '}
                <Text color={ui.warn} bold>
                    Ctrl-C
                </Text>{' '}
                again to quit, or any other key to stay
            </Text>
        </Box>
    );
}
