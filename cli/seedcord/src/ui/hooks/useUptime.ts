import { useState, useSyncExternalStore } from 'react';

import type { DevState } from '#ui/stores/DevStore';

const TICK_MS = 1000;

// react expects the same snapshot on every read between two ticks
class Clock {
    private nowMs = Date.now();

    public readonly subscribe = (onTick: () => void): (() => void) => {
        this.nowMs = Date.now();
        const timer = setInterval(() => {
            this.nowMs = Date.now();
            onTick();
        }, TICK_MS);
        return () => {
            clearInterval(timer);
        };
    };

    public readonly read = (): number => this.nowMs;
}

function never(): () => void {
    return () => undefined;
}

export function useUptime(state: DevState, shown: boolean): number | null {
    const { liveSinceMs } = state;
    const active = liveSinceMs !== null && shown;
    const [clock] = useState(() => new Clock());
    const nowMs = useSyncExternalStore(active ? clock.subscribe : never, clock.read);

    return active ? Math.max(0, Math.floor((nowMs - liveSinceMs) / TICK_MS) * TICK_MS) : null;
}
