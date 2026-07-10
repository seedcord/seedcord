import { ui } from '@ui/palette';

import type { TextProps } from 'ink';

export type DevPhase = 'starting' | 'running' | 'restart-required' | 'disconnected' | 'error' | 'quitting';

// disconnect only applies while a session is running. the other phases have nothing to stop.
export function isSessionLive(phase: DevPhase): boolean {
    return phase === 'running' || phase === 'restart-required';
}

// Phases where the process is up and emitting logs (in restart-required it is up but stale), so the live
// dot blinks. disconnected, error, and quitting produce no logs and read as idle.
export function isStreaming(phase: DevPhase): boolean {
    return phase === 'starting' || phase === 'running' || phase === 'restart-required';
}

// How the status glyph animates: a one-shot spinner for transient phases, a steady looping arc while the
// session is live, or a static icon for resting states.
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
    error: { label: 'error', icon: '✖', color: ui.bad, kind: 'static' },
    quitting: { label: 'quitting', icon: '◐', color: ui.muted, kind: 'spinner' }
} as const satisfies Record<DevPhase, PhaseMeta>;
