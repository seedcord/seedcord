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

    // Ref callback identity changes when scrollStorageKey changes, so React
    // runs cleanup (detach old listener) then re-attaches against the same
    // DOM node with the new key, restoring the new key's saved scrollTop.
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
