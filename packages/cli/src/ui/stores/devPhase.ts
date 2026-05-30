import type { TextProps } from 'ink';

export type DevPhase = 'starting' | 'running' | 'restart-required' | 'disconnected' | 'error' | 'quitting';

// Disconnect only applies while a bot session is actually running; the other phases have nothing to stop.
export function isSessionLive(phase: DevPhase): boolean {
    return phase === 'running' || phase === 'restart-required';
}

export interface PhaseMeta {
    readonly label: string;
    readonly icon: string;
    readonly color: TextProps['color'];
    readonly spinner: boolean;
}

// Single source for the status-badge presentation. `satisfies` keeps each entry's literal types while
// enforcing one entry per DevPhase, so adding a phase is a compile error until its meta is filled in.
export const PHASE_META = {
    starting: { label: 'STARTING', icon: '◐', color: 'cyan', spinner: true },
    running: { label: 'RUNNING', icon: '●', color: 'green', spinner: false },
    'restart-required': { label: 'RESTART', icon: '◆', color: 'yellow', spinner: false },
    disconnected: { label: 'OFFLINE', icon: '○', color: 'gray', spinner: false },
    error: { label: 'ERROR', icon: '✖', color: 'red', spinner: false },
    quitting: { label: 'QUITTING', icon: '◐', color: 'magenta', spinner: true }
} as const satisfies Record<DevPhase, PhaseMeta>;
