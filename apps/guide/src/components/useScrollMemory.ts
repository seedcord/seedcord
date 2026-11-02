'use client';

import { useEffect } from 'react';

const keyOf = (path: string): string => `scroll:${path}`;

// reading sessionStorage throws a SecurityError when the browser blocks storage
function sessionStore(): Storage | undefined {
    try {
        return sessionStorage;
    } catch {
        return undefined;
    }
}

export function useScrollMemory(path: string): void {
    useEffect(() => {
        const store = sessionStore();
        if (store === undefined) return undefined;

        const saved = store.getItem(keyOf(path));
        if (saved !== null && location.hash === '') scrollTo({ top: Number(saved), behavior: 'instant' });

        const remember = (): void => store.setItem(keyOf(path), String(scrollY));
        addEventListener('scroll', remember, { passive: true });
        return () => removeEventListener('scroll', remember);
    }, [path]);
}
