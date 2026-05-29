'use client';

import { useState, useEffect } from 'react';

export interface ActiveSignatureListProps {
    id: string;
    anchor?: string;
}

export function useActiveSignatureList(
    signatures: readonly ActiveSignatureListProps[]
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

        // justified: window.location.hash is unavailable during SSR, the timer schedules a post-hydration read so the URL drives the initial active signature.
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
                // eslint-disable-next-line react-compiler/react-compiler -- setActive is invoked from event handlers (signature click), not render. The compiler can't statically prove this so it false-positives on the external-mutation rule.
                window.location.hash = id;
            } catch {
                // ignore
            }
        }
    };

    return [effectiveActiveId, setActive] as const;
}
