'use client';
import { useCallback } from 'react';

export interface PendingSidebarSelection {
    packageId: string;
    versionId: string | null;
}

export function useSidebarPersistence(
    localPackageId: string,
    localVersionId: string
): {
    scrollRef: (el: HTMLDivElement | null) => () => void;
    collapsedStorageKey: string;
} {
    const collapsedStorageKey = `docs.sidebar.collapsed:${localPackageId}:${localVersionId}`;
    const scrollStorageKey = `docs.sidebar.scroll:${localPackageId}:${localVersionId}`;

    // the ref callback's identity changes with scrollStorageKey, so react detaches the old listener,
    // reattaches to the same node, and restores that key's saved scrollTop.
    const scrollRef = useCallback(
        (el: HTMLDivElement | null): (() => void) => {
            if (!el) return () => undefined;

            const ls = typeof window !== 'undefined' ? window.localStorage : null;

            if (ls) {
                const saved = ls.getItem(scrollStorageKey);
                if (saved !== null) {
                    const n = Number(saved);
                    if (!Number.isNaN(n)) el.scrollTop = n;
                }
            }

            const persist = (): void => {
                if (!ls) return;
                ls.setItem(scrollStorageKey, String(el.scrollTop));
            };

            el.addEventListener('scroll', persist, { passive: true });

            return () => {
                el.removeEventListener('scroll', persist);
            };
        },
        [scrollStorageKey]
    );

    return { scrollRef, collapsedStorageKey };
}
