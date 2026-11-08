'use client';

import { useEffect, useState } from 'react';

import { idOf } from '#components/TableOfContents';

import type { TOCItemType } from 'fumadocs-core/toc';

const VISIBLE_THRESHOLD = 0.9;

/**
 * Tracks which TOC headings are at least 90% visible in the viewport.
 *
 * fumadocs-core's `useActiveAnchors` can drop a heading that is still fully visible. Its
 * internal Observer keeps one "nearest heading" guess active whenever nothing crosses the
 * threshold. That guess can revert to inactive on the next unrelated intersection batch,
 * even when the heading never left the viewport. Two headings visible at once then collapse
 * back down to one. This hook updates each heading only from its own entries. One heading's
 * batch never erases another's state.
 */
export function useVisibleHeadingIds(items: readonly TOCItemType[]): ReadonlySet<string> {
    const [active, setActive] = useState<ReadonlySet<string>>(() => new Set());

    useEffect(() => {
        const elements = new Map(
            items
                .map((item): [string, HTMLElement | null] => [idOf(item.url), document.getElementById(idOf(item.url))])
                .filter((entry): entry is [string, HTMLElement] => entry[1] !== null)
        );

        // GuideShell only mounts this hook's callers once the page has a non-empty toc
        if (elements.size === 0) return;

        const intersecting = new Set<string>();

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    // threshold only decides when the observer fires. isIntersecting is true at any overlap
                    if (entry.isIntersecting && entry.intersectionRatio >= VISIBLE_THRESHOLD)
                        intersecting.add(entry.target.id);
                    else intersecting.delete(entry.target.id);
                }

                setActive(intersecting.size > 0 ? new Set(intersecting) : nearestHeading(entries, elements));
            },
            { threshold: VISIBLE_THRESHOLD }
        );

        for (const element of elements.values()) observer.observe(element);
        return () => observer.disconnect();
    }, [items]);

    return active;
}

// mirrors fumadocs-core's own fallback: highlight whichever heading sits closest to the viewport top
function nearestHeading(
    entries: readonly IntersectionObserverEntry[],
    elements: ReadonlyMap<string, HTMLElement>
): ReadonlySet<string> {
    const viewportTop = entries[0]?.rootBounds?.top ?? 0;
    let nearestId: string | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const [id, element] of elements) {
        const distance = Math.abs(viewportTop - element.getBoundingClientRect().top);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestId = id;
        }
    }

    return nearestId === undefined ? new Set() : new Set([nearestId]);
}
