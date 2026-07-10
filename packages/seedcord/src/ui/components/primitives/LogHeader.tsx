import { Box, Text, useAnimation } from 'ink';
import React from 'react';

import { ui } from '@ui/palette';

import type { ReactElement } from 'react';

const BLINK_MS = 530;

function LiveDot(): ReactElement {
    // a steady width (dot or space) keeps "live" from shifting
    const { frame } = useAnimation({ interval: BLINK_MS });
    return (
        <Text>
            <Text color={ui.bad}>{frame % 2 === 0 ? '●' : ' '}</Text>
            <Text dimColor> live</Text>
        </Text>
    );
}

interface LogHeaderProps {
    readonly following: boolean;
    readonly below: number;
    // true only while the session streams. the dot stops blinking once the session stops or crashes.
    readonly live: boolean;
}

export function LogHeader({ following, below, live }: LogHeaderProps): ReactElement {
    if (!following) {
        return (
            <Box flexShrink={0}>
                <Text color={ui.warn} wrap="truncate">{`▲ scrolled · ${below} newer below · b to follow`}</Text>
            </Box>
        );
    }

    return <Box flexShrink={0}>{live ? <LiveDot /> : <Text dimColor>○ idle</Text>}</Box>;
}
