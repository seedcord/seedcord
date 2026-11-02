'use client';

import { useLayoutEffect } from 'react';

const keyOf = (path: string): string => `scroll:${path}`;

function sessionStore(): Storage | undefined {
    try {
        return sessionStorage;
    } catch {
        // SecurityError, when the browser blocks storage
        return undefined;
    }
}

export function useScrollMemory(path: string): void {
    // runs before paint, after next.js has scrolled the new page to the top
    useLayoutEffect(() => {
        const store = sessionStore();
        if (store === undefined) return undefined;

        const saved = store.getItem(keyOf(path));
        if (saved !== null && location.hash === '') scrollTo({ top: Number(saved), behavior: 'instant' });

        const remember = (): void => {
            try {
                store.setItem(keyOf(path), String(scrollY));
            } catch {
                // QuotaExceededError once sessionStorage fills up
                removeEventListener('scroll', remember);
            }
        };
        addEventListener('scroll', remember, { passive: true });
        return () => removeEventListener('scroll', remember);
    }, [path]);
}
