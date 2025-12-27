import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React from 'react';

import type { ReactElement } from 'react';

interface StatusLineProps {
    readonly spinner?: boolean;
    readonly text: string;
    readonly color?: string;
}

export function StatusLine({ spinner, text, color = 'white' }: StatusLineProps): ReactElement {
    return (
        <Box>
            {spinner && (
                <Text color="yellow">
                    <Spinner type="dots" />{' '}
                </Text>
            )}
            <Text color={color}>{text}</Text>
        </Box>
    );
}
