import { useBoxMetrics } from 'ink';
import { useState } from 'react';

import type { DevPhase } from '#ui/stores/devPhase';
import type { DOMElement } from 'ink';
import type { RefObject } from 'react';

// held until the next restart so the rail doesn't resize mid-stream
export function useRailWidth(railRef: RefObject<DOMElement | null>, phase: DevPhase): number | null {
    const { width } = useBoxMetrics(railRef);
    const [locked, setLocked] = useState<number | null>(null);
    const running = phase === 'running';

    if (!running && locked !== null) setLocked(null);
    if (running && locked === null && width > 0) setLocked(width);

    return locked;
}
