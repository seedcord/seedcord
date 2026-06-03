import type { TextProps } from 'ink';

export type DevPhase = 'starting' | 'running' | 'restart-required' | 'disconnected' | 'error' | 'quitting';

// Disconnect only applies while a bot session is actually running; the other phases have nothing to stop.
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

// Single source for the status-badge presentation. `satisfies` keeps each entry's literal types while
// enforcing one entry per DevPhase, so adding a phase is a compile error until its meta is filled in.
export const PHASE_META = {
    starting: { label: 'starting', icon: '◐', color: 'cyan', kind: 'spinner' },
    running: { label: 'running', icon: '●', color: 'green', kind: 'arc' },
    'restart-required': { label: 'restart required', icon: '◆', color: 'yellow', kind: 'static' },
    disconnected: { label: 'offline', icon: '○', color: 'gray', kind: 'static' },
    error: { label: 'error', icon: '✖', color: 'red', kind: 'static' },
    quitting: { label: 'quitting', icon: '◐', color: 'magenta', kind: 'spinner' }
} as const satisfies Record<DevPhase, PhaseMeta>;
