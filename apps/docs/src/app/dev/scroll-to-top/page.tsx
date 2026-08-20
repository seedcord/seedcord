'use client';

import { ScrollToTopButton, cn } from '@seedcord/ui';

import type { ReactElement } from 'react';

const SCROLL_LINES = 80;

function ScrollToTopPage(): ReactElement {
    return (
        <div className={cn('space-y-6')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>ScrollToTopButton</h1>
                <p className={cn('text-subtle text-sm')}>
                    Composes <code>Button variant=&quot;ghost&quot; size=&quot;icon&quot;</code> with 48px override
                    (size-12). Listens to scroll, fades in past a derived threshold (0.4 × viewport, clamped 180-520px).
                    Click triggers smooth scrollTo top. Consumer fixes position (typically fixed bottom-6 right-6).
                </p>
                <p className={cn('text-subtle text-sm')}>↓ scroll down to see it fade in. fixed at bottom-right.</p>
            </header>
            <div
                className={cn('rounded-xl border border-(--border) bg-(--surface-subtle) p-6 text-sm/7 text-(--text)')}
            >
                {Array.from({ length: SCROLL_LINES }, (_, i) => {
                    const lineNumber = i + 1;
                    return <p key={`scroll-filler-${lineNumber}`}>scroll filler line {lineNumber}</p>;
                })}
            </div>
            <ScrollToTopButton className={cn('fixed right-6 bottom-6 z-50')} />
        </div>
    );
}

export default ScrollToTopPage;
