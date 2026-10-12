import { useCallback, useSyncExternalStore } from 'react';

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

export function useUptime(state: DevState, shown: boolean): number | null {
    const { liveSinceMs } = state;
    const active = liveSinceMs !== null && shown;

    // react expects the same snapshot on every read between two ticks
    const wholeSecondsUp = useCallback(
        () => (liveSinceMs === null ? 0 : Math.floor((Date.now() - liveSinceMs) / TICK_MS)),
        [liveSinceMs]
    );
    const seconds = useSyncExternalStore(active ? everySecond : never, wholeSecondsUp);

    return active ? seconds * TICK_MS : null;
}
