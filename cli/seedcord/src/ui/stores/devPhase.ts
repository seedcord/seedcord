import { ui } from '@ui/palette';

import type { TextProps } from 'ink';

export type DevPhase = 'starting' | 'running' | 'restart-required' | 'disconnected' | 'error' | 'quitting';

// disconnect only applies while a session is running. the other phases have nothing to stop.
export function isSessionLive(phase: DevPhase): boolean {
    return phase === 'running' || phase === 'restart-required';
}

// up and emitting logs (restart-required is up but stale), which is what the live dot blinks for
export function isStreaming(phase: DevPhase): boolean {
    return phase === 'starting' || phase === 'running' || phase === 'restart-required';
}

// spinner runs once, arc loops
type PhaseGlyph = 'spinner' | 'arc' | 'static';

export interface PhaseMeta {
    readonly label: string;
    readonly icon: string;
    readonly color: TextProps['color'];
    readonly kind: PhaseGlyph;
}

export const PHASE_META = {
    starting: { label: 'starting', icon: '◐', color: ui.accent, kind: 'spinner' },
    running: { label: 'running', icon: '●', color: ui.good, kind: 'arc' },
    'restart-required': { label: 'restart required', icon: '◆', color: ui.warn, kind: 'static' },
    disconnected: { label: 'offline', icon: '○', color: ui.muted, kind: 'static' },
    error: { label: 'error', icon: '✘', color: ui.bad, kind: 'static' },
    quitting: { label: 'quitting', icon: '◐', color: ui.muted, kind: 'spinner' }
} as const satisfies Record<DevPhase, PhaseMeta>;
