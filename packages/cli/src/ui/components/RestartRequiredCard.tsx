import { Box, Text } from 'ink';
import React from 'react';

import type { ReactElement } from 'react';

export function RestartRequiredCard(): ReactElement {
    return (
        <Box borderStyle="round" borderColor="yellow" flexDirection="column" paddingX={1}>
            <Text color="yellow" bold>
                Restart required
            </Text>
            <Text>
                A change needs a full restart. press{' '}
                <Text color="yellow" bold>
                    r
                </Text>{' '}
                to restart
            </Text>
        </Box>
    );
}
