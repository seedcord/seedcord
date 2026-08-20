'use client';

import { useLayoutEffect, useRef } from 'react';

import { cn } from './lib/cn';

import type { ReactElement, ReactNode } from 'react';

const shellRowClassName = cn('mx-auto flex w-full max-w-(--shell-max) items-center px-4 md:px-6');

export interface NavbarProps {
    mark?: ReactNode;
    center?: ReactNode;
    actions?: ReactNode;
    tabs?: ReactNode;
    className?: string | undefined;
}

export function Navbar({ mark, center, actions, tabs, className }: NavbarProps): ReactElement {
    const ref = useRef<HTMLElement>(null);

    // the sidebar top and the page offset both read --nav-h, and the tab row makes the height vary per site
    useLayoutEffect(() => {
        const measure = (): void => {
            const height = ref.current?.getBoundingClientRect().height ?? 0;
            if (height > 0) document.documentElement.style.setProperty('--nav-h', `${height}px`);
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    return (
        <header
            ref={ref}
            className={cn(
                'fixed inset-x-0 top-0 z-50 border-b border-(--border) bg-(--bg-navbar) backdrop-blur',
                className
            )}
        >
            {/* the centre column stays on the viewport centre at any side width */}
            <div className={cn(shellRowClassName, 'grid grid-cols-[1fr_auto_1fr] gap-4 py-4 md:gap-6')}>
                <div className={cn('flex items-center')}>{mark}</div>
                <div className={cn('flex items-center justify-center')}>{center}</div>
                <div className={cn('flex items-center justify-end gap-2')}>{actions}</div>
            </div>
            {tabs ? <div className={cn(shellRowClassName, 'border-t border-(--border)')}>{tabs}</div> : null}
        </header>
    );
}
