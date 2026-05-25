'use client';
import { type TouchEvent, type UIEvent, useCallback, type WheelEvent } from 'react';

import { applyScrollDelta } from './applyScrollDelta';
import { normalizeWheelDelta } from './normalizeWheelDelta';

export function useSidebarScrollGuards(): {
    handleWheel: (event: WheelEvent<HTMLDivElement>) => void;
    handleScroll: (event: UIEvent<HTMLDivElement>) => void;
    handleTouchStart: (event: TouchEvent<HTMLDivElement>) => void;
    handleTouchMove: (event: TouchEvent<HTMLDivElement>) => void;
    handleTouchEnd: () => void;
} {
    const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
        const viewport = event.currentTarget;

        // If this viewport isn't actually scrollable yet, let the wheel bubble
        // up to an ancestor that might be. Calling stopPropagation here would
        // capture and silently drop the event — the "tight spring" bug.
        if (viewport.scrollHeight <= viewport.clientHeight) {
            return;
        }

        event.stopPropagation();

        const normalizedDeltaY = normalizeWheelDelta(event, viewport);

        applyScrollDelta(viewport, normalizedDeltaY);
    }, []);

    const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
        event.stopPropagation();
    }, []);

    const handleTouchStart = useCallback((_event: TouchEvent<HTMLDivElement>) => {
        // Native scrolling is preferred for momentum
    }, []);

    const handleTouchMove = useCallback((_event: TouchEvent<HTMLDivElement>) => {
        // Native scrolling is preferred for momentum
    }, []);

    const handleTouchEnd = useCallback(() => {
        // Native scrolling is preferred for momentum
    }, []);

    return {
        handleWheel,
        handleScroll,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd
    };
}
