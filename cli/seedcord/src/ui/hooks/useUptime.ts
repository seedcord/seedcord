import { useSyncExternalStore } from 'react';

import type { DevState } from '#ui/stores/DevStore';

const TICK_MS = 1000;

function everySecond(onTick: () => void): () => void {
    const timer = setInterval(onTick, TICK_MS);
    return () => {
        clearInterval(timer);
    };
}

function never(): () => void {
    return () => undefined;
}

// react expects the same snapshot on every read between two ticks
function currentSecond(): number {
    return Math.floor(Date.now() / TICK_MS) * TICK_MS;
}

export function useUptime(state: DevState, shown: boolean): number | null {
    const { liveSince } = state;
    const active = liveSince !== null && shown;
    const now = useSyncExternalStore(active ? everySecond : never, currentSecond);

    return active ? Math.max(0, now - liveSince) : null;
}
