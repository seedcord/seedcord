import { LINE_SCROLL_PIXELS } from './constants';

import type { WheelEvent } from 'react';

export function normalizeWheelDelta(event: WheelEvent<HTMLDivElement>, viewport: HTMLDivElement): number {
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
        return event.deltaY * LINE_SCROLL_PIXELS;
    }

    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
        return event.deltaY * viewport.clientHeight;
    }

    return event.deltaY;
}
