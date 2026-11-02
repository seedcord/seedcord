'use client';

import { useRef } from 'react';

export interface SectionCursor {
    section: () => string | undefined;
    step: (by: 1 | -1) => void;
}

function onScreen(id: string | undefined): id is string {
    const box = document.getElementById(id ?? '')?.getBoundingClientRect();
    return box !== undefined && box.bottom > 0 && box.top < globalThis.innerHeight;
}

// the heading in view trails a scroll, and near the page end it never reaches the last headings
export function useSectionCursor(headingIds: readonly string[], inView: string | undefined): SectionCursor {
    const cursor = useRef<string | undefined>(undefined);

    const section = (): string | undefined => (onScreen(cursor.current) ? cursor.current : inView);

    const step = (by: 1 | -1): void => {
        const target = headingIds[headingIds.indexOf(section() ?? '') + by];
        if (target === undefined) return;
        cursor.current = target;
        document.getElementById(target)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    };

    return { section, step };
}
