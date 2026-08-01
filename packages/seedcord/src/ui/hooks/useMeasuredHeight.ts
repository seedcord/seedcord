import { measureElement } from 'ink';
import { useLayoutEffect, useState } from 'react';

import type { DOMElement } from 'ink';
import type { RefObject } from 'react';

/**
 * The rendered height of a box, 0 until the first measurement lands.
 *
 * No dep array. A box moves for reasons its caller cannot enumerate, and one of them can be derived from the
 * height itself, which rules out a dependency list. The equality bail is what keeps the per-render measurement
 * from forming an update chain.
 */
export function useMeasuredHeight(ref: RefObject<DOMElement | null>): number {
    const [height, setHeight] = useState(0);

    // eslint-disable-next-line @eslint-react/exhaustive-deps, react-hooks/exhaustive-deps -- see the doc above
    useLayoutEffect(() => {
        if (!ref.current) return;
        const next = measureElement(ref.current).height;
        // eslint-disable-next-line @eslint-react/set-state-in-effect -- Ink layout is only measurable after render
        setHeight((prev) => (prev === next ? prev : next));
    });

    return height;
}
