import { useAnimation } from 'ink';

import { isSessionLive } from '@ui/stores/devPhase';

import type { DevState } from '@ui/stores/DevStore';

const TICK_MS = 1000;

// ink's useAnimation resets time to 0 on reactivation, so it restarts each run and keeps counting across restart-required
export function useUptime(state: DevState): number | null {
    const active = isSessionLive(state.phase);
    const { time } = useAnimation({ interval: TICK_MS, isActive: active });
    return active ? time : null;
}
