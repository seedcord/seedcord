import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React from 'react';

import { ui } from '@ui/palette';

import type { TunnelPhase } from '@commands/dev/tunnel/TunnelCoordinator';
import type { ReactElement } from 'react';

const STEPS: readonly (readonly [TunnelPhase, string])[] = [
    ['opening', 'Opening the tunnel'],
    ['resolving', 'Waiting for it to answer'],
    ['registering', 'Telling Discord where to reach you']
];

function Marker({ done, active }: { done: boolean; active: boolean }): ReactElement {
    if (done) return <Text color={ui.good}>✔︎</Text>;
    if (active) return <Spinner type="dots" />;
    return <Text color={ui.faint}>·</Text>;
}

export function TunnelOpeningCard({ phase }: { phase: TunnelPhase }): ReactElement {
    const at = STEPS.findIndex(([step]) => step === phase);

    return (
        <Box borderStyle="round" borderColor={ui.accent} flexDirection="column" paddingX={1}>
            <Text color={ui.accent} bold>
                Setting up your interactions endpoint
            </Text>
            {STEPS.map(([step, label], index) => (
                <Text key={step} dimColor={index > at}>
                    <Marker done={index < at} active={index === at} /> {label}
                </Text>
            ))}
        </Box>
    );
}
