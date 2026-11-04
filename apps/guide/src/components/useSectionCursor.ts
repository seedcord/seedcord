'use client';

import { useRef } from 'react';

export interface SectionCursor {
    section: () => string;
    step: (by: 1 | -1) => void;
    toTop: () => void;
    toBottom: () => void;
}

// the page title's copy button has an empty data-copy-anchor
const PAGE_TOP = '';

function onScreen(id: string | undefined): id is string {
    const box = document.getElementById(id ?? '')?.getBoundingClientRect();
    return box !== undefined && box.bottom > 0 && box.top < globalThis.innerHeight;
}

// the heading in view trails a scroll, and near the page end it never reaches the last headings
export function useSectionCursor(headingIds: readonly string[], inView: string | undefined): SectionCursor {
    const cursor = useRef<string | undefined>(undefined);
    const stops = [PAGE_TOP, ...headingIds];

    const section = (): string => {
        if (onScreen(cursor.current)) return cursor.current;
        return globalThis.scrollY === 0 ? PAGE_TOP : (inView ?? PAGE_TOP);
    };

    const scrollPage = (top: number, stop: string): void => {
        cursor.current = stop;
        globalThis.scrollTo({ top, behavior: 'instant' });
    };

    const toTop = (): void => scrollPage(0, PAGE_TOP);

    const toBottom = (): void => scrollPage(document.documentElement.scrollHeight, headingIds.at(-1) ?? PAGE_TOP);

    const step = (by: 1 | -1): void => {
        const target = stops[stops.indexOf(section()) + by];
        if (target === undefined) return;
        if (target === PAGE_TOP) {
            toTop();
            return;
        }
        cursor.current = target;
        document.getElementById(target)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    };

    return { section, step, toTop, toBottom };
}
