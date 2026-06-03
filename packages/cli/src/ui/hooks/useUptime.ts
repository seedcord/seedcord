import { useAnimation } from 'ink';

import { isSessionLive } from '@ui/stores/devPhase';

import type { DevState } from '@ui/stores/DevStore';

const TICK_MS = 1000;

// Elapsed ms while a session is live (running or restart-required), else null. useAnimation's `time` counts
// real elapsed ms and resets to 0 when reactivated, so it restarts on each fresh run and keeps counting
// across restart-required. No stored timestamp, manual timer, or Date.now()-in-render needed.
export function useUptime(state: DevState): number | null {
    const active = isSessionLive(state.phase);
    const { time } = useAnimation({ interval: TICK_MS, isActive: active });
    return active ? time : null;
}
