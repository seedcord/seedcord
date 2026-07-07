import { Box, Text, useAnimation } from 'ink';
import React from 'react';

import type { ReactElement } from 'react';

const BLINK_MS = 530;

function LiveDot(): ReactElement {
    // Blink the dot via the animation frame; a steady width (dot or space) keeps "live" from shifting.
    const { frame } = useAnimation({ interval: BLINK_MS });
    return (
        <Text>
            <Text color="red">{frame % 2 === 0 ? '●' : ' '}</Text>
            <Text dimColor> live</Text>
        </Text>
    );
}

interface LogHeaderProps {
    readonly following: boolean;
    readonly below: number;
    // True only while the session streams; the dot stops blinking once the session stops or crashes.
    readonly live: boolean;
}

// Sits above the logs: a blinking live dot while tailing a streaming session, a static idle marker once the
// session stops or crashes, or the scroll status once scrolled away.
export function LogHeader({ following, below, live }: LogHeaderProps): ReactElement {
    if (!following) {
        return (
            <Box flexShrink={0}>
                <Text color="yellow" wrap="truncate">{`▲ scrolled · ${below} newer below · b to follow`}</Text>
            </Box>
        );
    }

    return <Box flexShrink={0}>{live ? <LiveDot /> : <Text dimColor>○ idle</Text>}</Box>;
}
