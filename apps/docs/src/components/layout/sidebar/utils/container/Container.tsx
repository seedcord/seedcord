'use client';

import { cloneElement, isValidElement, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@lib/utils';
import ScrollToTopButton from '@ui/ScrollToTopButton';

import DesktopSidebarFrame from './DesktopSidebarFrame';
import MobileNavigationToggle from './MobileNavigationToggle';
import MobilePanelDialog from './MobilePanelDialog';
import { SIDEBAR_WIDTH } from '../constants';

import type { SidebarProps as SidebarComponentProps } from '../../types';
import type { CSSProperties, ReactElement, ReactNode } from 'react';

export interface ContainerProps {
    sidebar: ReactNode;
    children: ReactNode;
    className?: string;
}

function Container({ sidebar, children, className }: ContainerProps): ReactNode {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [navigationOpen, setNavigationOpen] = useState(false);
    const sidebarVariants = useMemo<{ desktop: ReactNode; mobile: ReactNode }>(() => {
        if (!isValidElement(sidebar)) {
            return { desktop: sidebar, mobile: sidebar };
        }

        const sidebarElement = sidebar as ReactElement<SidebarComponentProps>;
        const mergedClassName = cn('flex h-full w-full flex-col', sidebarElement.props.className);

        const desktop = cloneElement<SidebarComponentProps>(sidebarElement, {
            className: mergedClassName,
            variant: sidebarElement.props.variant ?? 'desktop'
        });

        const mobile = cloneElement<SidebarComponentProps>(sidebarElement, {
            className: cn(mergedClassName, 'border-transparent bg-transparent p-0 shadow-none'),
            variant: 'mobile'
        });

        return { desktop, mobile };
    }, [sidebar]);
    const { desktop: desktopSidebar, mobile: mobileSidebar } = sidebarVariants;

    useLayoutEffect(() => {
        const updateNavigationHeight = (): void => {
            const header = document.querySelector<HTMLElement>('header');
            const height = header?.getBoundingClientRect().height ?? 0;

            if (containerRef.current && height > 0) {
                containerRef.current.style.setProperty('--nav-h', `${height}px`);
            }
        };

        updateNavigationHeight();
        window.addEventListener('resize', updateNavigationHeight);

        return () => {
            window.removeEventListener('resize', updateNavigationHeight);
        };
    }, []);

    const containerStyle: CSSProperties & {
        '--nav-h': string;
        '--sidebar-width': string;
    } = {
        '--nav-h': '64px',
        '--sidebar-width': `${SIDEBAR_WIDTH}px`
    };

    return (
        <div ref={containerRef} style={containerStyle} className={cn('flex w-full flex-1 flex-col gap-5', className)}>
            <MobileNavigationToggle onOpen={() => setNavigationOpen(true)} />

            <MobilePanelDialog open={navigationOpen} onOpenChange={setNavigationOpen} title="Navigation">
                {mobileSidebar}
            </MobilePanelDialog>

            <div className="flex w-full min-w-0 flex-1">
                <DesktopSidebarFrame sidebar={desktopSidebar} />
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <div className="mx-auto w-full max-w-none min-w-0 px-3 pt-6 pb-12 md:px-7 md:pt-8 lg:px-10 lg:pt-10">
                        {children}
                    </div>
                </div>
            </div>

            <ScrollToTopButton className="fixed right-6 bottom-10" />
        </div>
    );
}

export default Container;
