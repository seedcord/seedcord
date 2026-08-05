import { Box, Text } from 'ink';
import React from 'react';

import { ui } from '@ui/palette';

import type { ReactElement } from 'react';

export function TunnelOpeningCard(): ReactElement {
    return (
        <Box borderStyle="round" borderColor={ui.accent} flexDirection="column" paddingX={1}>
            <Text color={ui.accent} bold>
                Setting up your interactions endpoint
            </Text>
            <Text>Discord cannot reach your bot until this finishes.</Text>
        </Box>
    );
}
