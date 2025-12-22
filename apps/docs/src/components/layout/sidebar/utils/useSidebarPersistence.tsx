'use client';
import { useRef, useEffect } from 'react';

export interface PendingSidebarSelection {
    packageId: string;
    versionId: string | null;
}
export function useSidebarPersistence(
    localPackageId: string,
    localVersionId: string,
    handleScroll: (e: React.UIEvent<HTMLDivElement>) => void
): {
    scrollRef: React.RefObject<HTMLDivElement | null>;
    collapsedStorageKey: string;
    composedHandleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
} {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const collapsedStorageKey = `docs.sidebar.collapsed:${localPackageId}:${localVersionId}`;
    const scrollStorageKey = `docs.sidebar.scroll:${localPackageId}:${localVersionId}`;

    useEffect(() => {
        const ls = typeof window !== 'undefined' ? window.localStorage : null;
        const el = scrollRef.current;
        if (el && ls) {
            const saved = ls.getItem(scrollStorageKey);
            if (saved) {
                const n = Number(saved);
                if (!Number.isNaN(n)) el.scrollTop = n;
            }
        }
    }, [localPackageId, localVersionId, scrollStorageKey]);

    const composedHandleScroll = (e: React.UIEvent<HTMLDivElement>): void => {
        handleScroll(e);
        const ls = typeof window !== 'undefined' ? window.localStorage : null;
        const el = scrollRef.current;
        if (el && ls) {
            ls.setItem(scrollStorageKey, String(el.scrollTop));
        }
    };

    return { scrollRef, collapsedStorageKey, composedHandleScroll };
}
