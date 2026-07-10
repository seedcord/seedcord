import { Text } from 'ink';
import Spinner from 'ink-spinner';
import React from 'react';

import { PHASE_META } from '@ui/stores/devPhase';

import type { DevPhase } from '@ui/stores/devPhase';
import type { ReactElement } from 'react';

interface StatusBadgeProps {
    readonly phase: DevPhase;
}

function Glyph({ phase }: { phase: DevPhase }): ReactElement {
    const meta = PHASE_META[phase];
    if (meta.kind === 'spinner') return <Spinner type="balloon2" />;
    if (meta.kind === 'arc') return <Spinner type="toggle4" />;
    return <Text>{meta.icon}</Text>;
}

export function StatusBadge({ phase }: StatusBadgeProps): ReactElement {
    const meta = PHASE_META[phase];
    return (
        <Text color={meta.color} bold>
            <Glyph phase={phase} /> {meta.label}
        </Text>
    );
}
