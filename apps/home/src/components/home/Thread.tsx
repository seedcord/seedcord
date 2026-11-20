'use client';

import { useEffect, useRef } from 'react';

import { highlightText } from '#lib/highlightText';

import type { ReactNode } from 'react';

interface ThreadProps {
    terms: readonly string[];
    className?: string;
    children: ReactNode;
}

export function Thread({ terms, className, children }: ThreadProps): ReactNode {
    const root = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (root.current === null) return;

        const cards = [...root.current.querySelectorAll('.code-card')];
        return highlightText({ thread: cards.map((card) => ({ root: card, texts: terms })) });
    }, [terms]);

    return (
        <div ref={root} className={className}>
            {children}
        </div>
    );
}
