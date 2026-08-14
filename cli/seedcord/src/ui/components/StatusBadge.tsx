import { Text } from 'ink';
import Spinner from 'ink-spinner';
import React from 'react';

import { isStreaming, PHASE_META } from '@ui/stores/devPhase';

import { BlinkDot } from './primitives/BlinkDot';

import type { DevPhase } from '@ui/stores/devPhase';
import type { ReactElement } from 'react';

interface StatusBadgeProps {
    readonly phase: DevPhase;
    readonly glyph?: 'phase' | 'live';
    readonly animate?: boolean;
}

function Glyph({ phase, glyph, animate }: Required<StatusBadgeProps>): ReactElement {
    const meta = PHASE_META[phase];
    if (glyph === 'live') return isStreaming(phase) ? <BlinkDot animate={animate} /> : <Text>{meta.icon}</Text>;
    // ink-spinner keeps its frame index across a type swap and wraps on equality, so a 7-frame
    // index carried into a 4-frame set renders nothing forever. The key forces a fresh mount.
    if (meta.kind === 'spinner') return <Spinner key="balloon2" type="balloon2" />;
    // the arc runs for as long as the bot does
    if (meta.kind === 'arc' && animate) return <Spinner key="toggle4" type="toggle4" />;
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
