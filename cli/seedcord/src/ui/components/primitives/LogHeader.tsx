import { Box, Text } from 'ink';
import React from 'react';

import { ui } from '@ui/palette';

import type { ReactElement } from 'react';

interface LogHeaderProps {
    readonly following: boolean;
    readonly below: number;
}

export function LogHeader({ following, below }: LogHeaderProps): ReactElement | null {
    if (following) return null;
    return (
        <Box flexShrink={0}>
            <Text color={ui.warn} wrap="truncate">{`▲ scrolled · ${below} newer below · b to follow`}</Text>
        </Box>
    );
}
