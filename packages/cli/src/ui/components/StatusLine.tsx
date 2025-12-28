import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React from 'react';

import { accents } from './shared';

import type { ReactElement } from 'react';

interface StatusLineProps {
    readonly spinner?: boolean;
    readonly text: string;
    readonly color?: string;
}

export function StatusLine({ spinner, text, color = 'white' }: StatusLineProps): ReactElement {
    return (
        <Box paddingY={1}>
            {spinner && (
                <Text color={accents.a}>
                    <Spinner type="balloon2" />{' '}
                </Text>
            )}
            <Text color={color} wrap="truncate">
                {text}
            </Text>
        </Box>
    );
}
