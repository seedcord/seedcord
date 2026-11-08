import { Text } from 'ink';
import React from 'react';

import { isStreaming, PHASE_META } from '#ui/stores/devPhase';

import { BlinkDot } from './primitives/BlinkDot';
import { Spinner } from './primitives/Spinner';

import type { DevPhase } from '#ui/stores/devPhase';
import type { ReactElement } from 'react';

interface StatusBadgeProps {
    readonly phase: DevPhase;
    readonly glyph?: 'phase' | 'live';
    readonly animate?: boolean;
}

function Glyph({ phase, glyph, animate }: Required<StatusBadgeProps>): ReactElement {
    const meta = PHASE_META[phase];
    if (glyph === 'live') return isStreaming(phase) ? <BlinkDot animate={animate} /> : <Text>{meta.icon}</Text>;
    if (meta.kind === 'spinner') return <Spinner type="balloon2" />;
    // the arc runs for as long as the bot does
    if (meta.kind === 'arc' && animate) return <Spinner type="toggle4" />;
    return <Text>{meta.icon}</Text>;
}

export function StatusBadge({ phase, glyph = 'phase', animate = true }: StatusBadgeProps): ReactElement {
    const meta = PHASE_META[phase];
    return (
        <Text color={meta.color} bold>
            <Glyph phase={phase} glyph={glyph} animate={animate} /> {meta.label}
        </Text>
    );
}
