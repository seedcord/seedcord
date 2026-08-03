import { Box, Text } from 'ink';
import React from 'react';

import { ui } from '@ui/palette';

import type { ReactElement } from 'react';

export function RestartRequiredCard(): ReactElement {
    return (
        <Box borderStyle="round" borderColor={ui.warn} flexDirection="column" paddingX={1}>
            <Text color={ui.warn} bold>
                Restart required
            </Text>
            <Text>
                A change needs a full restart. press{' '}
                <Text color={ui.warn} bold>
                    r
                </Text>{' '}
                to restart
            </Text>
        </Box>
    );
}
