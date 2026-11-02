'use client';

import { useEffect } from 'react';

const keyOf = (path: string): string => `scroll:${path}`;

export function useScrollMemory(path: string): void {
    useEffect(() => {
        const saved = sessionStorage.getItem(keyOf(path));
        if (saved !== null && location.hash === '') scrollTo({ top: Number(saved), behavior: 'instant' });

        const remember = (): void => sessionStorage.setItem(keyOf(path), String(scrollY));
        addEventListener('scroll', remember, { passive: true });
        return () => removeEventListener('scroll', remember);
    }, [path]);
}
