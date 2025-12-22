'use client';

import { useState, useEffect } from 'react';

export interface ActiveSignatureListProps {
    id: string;
    anchor?: string;
}

export function useActiveSignatureList(
    signatures: ActiveSignatureListProps[]
): readonly [string, (id: string) => void] {
    const [activeId, setActiveId] = useState<string>(() => signatures[0]?.id ?? '');

    const effectiveActiveId = signatures.some((s) => s.id === activeId) ? activeId : (signatures[0]?.id ?? '');

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;

        const handleHash = (): void => {
            const hash = window.location.hash.slice(1);
            if (!hash) return;
            const matching = signatures.find((s) => s.id === hash || s.anchor === hash);
            if (matching) {
                setActiveId(matching.id);
            }
        };

        const initTimeout = window.setTimeout(handleHash, 0);
        window.addEventListener('hashchange', handleHash);
        return () => {
            window.clearTimeout(initTimeout);
            window.removeEventListener('hashchange', handleHash);
        };
    }, [signatures]);

    const setActive = (id: string): void => {
        if (id === activeId) return;
        setActiveId(id);
        if (typeof window !== 'undefined') {
            try {
                window.location.hash = id;
            } catch {
                // ignore
            }
        }
    };

    return [effectiveActiveId, setActive] as const;
}
