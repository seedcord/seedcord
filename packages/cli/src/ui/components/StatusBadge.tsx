import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import React from 'react';

import { PHASE_META } from '@ui/stores/devPhase';

import type { DevPhase } from '@ui/stores/devPhase';
import type { ReactElement } from 'react';

interface StatusBadgeProps {
    readonly phase: DevPhase;
    readonly detail: string;
}

export function StatusBadge({ phase, detail }: StatusBadgeProps): ReactElement {
    const meta = PHASE_META[phase];
    return (
        <Box paddingY={1}>
            <Text color={meta.color} bold>
                {meta.spinner ? <Spinner type="balloon2" /> : meta.icon} {meta.label}
            </Text>
            {detail ? <Text dimColor>{`  ${detail}`}</Text> : null}
        </Box>
    );
}
