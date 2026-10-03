'use client';

import { cn } from '@seedcord/ui';
import { usePathname } from 'next/navigation';
import { useState, ViewTransition, type ReactNode } from 'react';

type Direction = 'next' | 'prev';

// a page further down the sidebar slides in from below
function useSidebarDirection(order: readonly string[]): Direction {
    const pathname = usePathname();
    const [shown, setShown] = useState<{ pathname: string; direction: Direction }>({ pathname, direction: 'next' });

    if (shown.pathname !== pathname) {
        const direction = order.indexOf(pathname) < order.indexOf(shown.pathname) ? 'prev' : 'next';
        setShown({ pathname, direction });
        return direction;
    }
    return shown.direction;
}

export function PageTransition({ order, children }: { order: readonly string[]; children: ReactNode }): ReactNode {
    const direction = useSidebarDirection(order);

    return (
        <ViewTransition update={`page-${direction}`} default="none">
            <main id="main-content" className={cn('min-w-0')}>
                {children}
            </main>
        </ViewTransition>
    );
}
