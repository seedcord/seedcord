import { measureElement } from 'ink';
import { useLayoutEffect, useRef, useState } from 'react';

import type { DevPhase } from '#ui/stores/devPhase';
import type { DOMElement } from 'ink';
import type { RefObject } from 'react';

// held until the next restart so the rail doesn't resize mid-stream
export function useRailWidth(
    railRef: RefObject<DOMElement | null>,
    phase: DevPhase,
    rows: number,
    columns: number
): number | null {
    const [railWidth, setRailWidth] = useState<number | null>(null);
    const needsMeasureRef = useRef(true);

    useLayoutEffect(() => {
        if (phase !== 'running') {
            needsMeasureRef.current = true;
            // drop the lock too, because a rail still constrained by it would measure back the old width
            // eslint-disable-next-line @eslint-react/set-state-in-effect, react-hooks/set-state-in-effect -- see the measurement set below
            setRailWidth(null);
            return;
        }
        if (!needsMeasureRef.current || !railRef.current) return;
        const measured = measureElement(railRef.current).width;
        if (measured > 0) {
            needsMeasureRef.current = false;
            // eslint-disable-next-line @eslint-react/set-state-in-effect -- rail width comes from measuring the rendered element, set once per run
            setRailWidth(measured);
        }
    }, [rows, columns, phase, railRef]);

    return railWidth;
}
