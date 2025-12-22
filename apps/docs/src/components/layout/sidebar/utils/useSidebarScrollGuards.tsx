'use client';
import { type WheelEvent, type UIEvent, type TouchEvent, useRef, useCallback } from 'react';

import { applyScrollDelta } from './applyScrollDelta';
import { normalizeWheelDelta } from './normalizeWheelDelta';

export function useSidebarScrollGuards(): {
    handleWheel: (event: WheelEvent<HTMLDivElement>) => void;
    handleScroll: (event: UIEvent<HTMLDivElement>) => void;
    handleTouchStart: (event: TouchEvent<HTMLDivElement>) => void;
    handleTouchMove: (event: TouchEvent<HTMLDivElement>) => void;
    handleTouchEnd: () => void;
} {
    const lastTouchYRef = useRef<number | null>(null);

    const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
        event.stopPropagation();

        const viewport = event.currentTarget;

        if (viewport.scrollHeight <= viewport.clientHeight) {
            return;
        }

        const normalizedDeltaY = normalizeWheelDelta(event, viewport);

        applyScrollDelta(viewport, normalizedDeltaY);
    }, []);

    const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
        event.stopPropagation();
    }, []);

    const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
        const touch = event.touches[0];

        if (!touch) {
            return;
        }

        lastTouchYRef.current = touch.clientY;
    }, []);

    const handleTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
        event.stopPropagation();

        const viewport = event.currentTarget;

        if (viewport.scrollHeight <= viewport.clientHeight) {
            return;
        }

        const touch = event.touches[0];

        if (!touch) {
            return;
        }

        const previousY = lastTouchYRef.current;

        if (previousY === null) {
            lastTouchYRef.current = touch.clientY;
            return;
        }

        const deltaY = previousY - touch.clientY;

        if (deltaY !== 0) {
            applyScrollDelta(viewport, deltaY);
        }

        lastTouchYRef.current = touch.clientY;
    }, []);

    const handleTouchEnd = useCallback(() => {
        lastTouchYRef.current = null;
    }, []);

    return {
        handleWheel,
        handleScroll,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd
    };
}
