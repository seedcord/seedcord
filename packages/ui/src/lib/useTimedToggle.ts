'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Returns `[active, trigger]`. Calling `trigger()` flips `active` to true and schedules a
// revert to false after `durationMs`. Re-triggering resets the timer so the feedback window
// stays at exactly `durationMs` from the most recent trigger. Cleans the timer on unmount.
export function useTimedToggle(durationMs: number): [boolean, () => void] {
    const [active, setActive] = useState(false);
    const timerRef = useRef<number | null>(null);

    useEffect(
        () => () => {
            if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        },
        []
    );

    const trigger = useCallback(() => {
        setActive(true);
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
            setActive(false);
            timerRef.current = null;
        }, durationMs);
    }, [durationMs]);

    return [active, trigger];
}
