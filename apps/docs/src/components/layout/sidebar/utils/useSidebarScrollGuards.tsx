'use client';
import { useCallback, type WheelEvent } from 'react';

import { applyScrollDelta } from './applyScrollDelta';
import { normalizeWheelDelta } from './normalizeWheelDelta';

export function useSidebarScrollGuards(): {
    handleWheel: (event: WheelEvent<HTMLDivElement>) => void;
} {
    const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
        const viewport = event.currentTarget;

        // calling stopPropagation before the scrollable check captures + drops
        // wheel events on non-scrolling viewports (the "tight spring" bug).
        if (viewport.scrollHeight <= viewport.clientHeight) {
            return;
        }

        event.stopPropagation();

        const normalizedDeltaY = normalizeWheelDelta(event, viewport);

        applyScrollDelta(viewport, normalizedDeltaY);
    }, []);

    return {
        handleWheel
    };
}
