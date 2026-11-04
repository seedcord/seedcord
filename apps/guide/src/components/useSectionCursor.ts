'use client';

import { useRef } from 'react';

export interface SectionCursor {
    section: () => string | undefined;
    step: (by: 1 | -1) => void;
}

const PAGE_TOP = '';

function onScreen(id: string | undefined): id is string {
    const box = document.getElementById(id ?? '')?.getBoundingClientRect();
    return box !== undefined && box.bottom > 0 && box.top < globalThis.innerHeight;
}

// the heading in view trails a scroll, and near the page end it never reaches the last headings
export function useSectionCursor(headingIds: readonly string[], inView: string | undefined): SectionCursor {
    const cursor = useRef<string | undefined>(undefined);
    const stops = [PAGE_TOP, ...headingIds];

    const section = (): string | undefined => (onScreen(cursor.current) ? cursor.current : inView);

    const currentStop = (): string => {
        if (cursor.current === PAGE_TOP && globalThis.scrollY === 0) return PAGE_TOP;
        return section() ?? PAGE_TOP;
    };

    const step = (by: 1 | -1): void => {
        const target = stops[stops.indexOf(currentStop()) + by];
        if (target === undefined) return;
        cursor.current = target;
        if (target === PAGE_TOP) globalThis.scrollTo({ top: 0, behavior: 'instant' });
        else document.getElementById(target)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    };

    return { section, step };
}
