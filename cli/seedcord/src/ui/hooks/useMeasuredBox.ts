import { measureElement } from 'ink';
import { useLayoutEffect, useState } from 'react';

import type { DOMElement } from 'ink';
import type { RefObject } from 'react';

export interface MeasuredBox {
    readonly width: number;
    readonly height: number;
}

const UNMEASURED: MeasuredBox = { width: 0, height: 0 };

export function useMeasuredBox(ref: RefObject<DOMElement | null>): MeasuredBox {
    const [box, setBox] = useState<MeasuredBox>(UNMEASURED);

    // eslint-disable-next-line @eslint-react/exhaustive-deps, react-hooks/exhaustive-deps -- the measured size can change on any render, so no dep list covers it
    useLayoutEffect(() => {
        if (!ref.current) return;
        const { width, height } = measureElement(ref.current);

        setBox((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });

    return box;
}
