'use client';

import { Button, GithubIcon, Icon, cn, ScrollToTopButton } from '@seedcord/ui';
import Link from 'next/link';
import { useLayoutEffect, useRef } from 'react';

import { ClearHistoryRow } from '@components/header/settings/ClearHistoryRow';
import { Sidebar } from '@components/layout/sidebar/Sidebar';
import { SIDEBAR_WIDTH } from '@components/layout/sidebar/utils/constants';
import { useUIStore } from '@store/ui';

import { DesktopSidebarFrame } from './DesktopSidebarFrame';
import { MobilePanelDialog } from './MobilePanelDialog';

import type { DocsCatalog } from '@lib/docs/types';
import type { CSSProperties, ReactNode } from 'react';

const mobilePanelFooter = (
    <div className={cn('flex items-center gap-2')}>
        <div className={cn('min-w-0 flex-1')}>
            <ClearHistoryRow />
        </div>
        <Button asChild variant="ghost" size="icon" aria-label="Open GitHub repository">
            <Link href="https://github.com/seedcord/seedcord" target="_blank" rel="noreferrer">
                <Icon icon={GithubIcon} size={18} />
            </Link>
        </Button>
    </div>
);

interface ContainerProps {
    catalog: DocsCatalog;
    activePackageId: string;
    activeVersionId: string;
    children: ReactNode;
    className?: string;
}

const SIDEBAR_BASE_CLASS = 'flex size-full flex-col';
const MOBILE_SIDEBAR_OVERRIDES = 'border-transparent bg-transparent shadow-none';

export function Container({
    catalog,
    activePackageId,
    activeVersionId,
    children,
    className
}: ContainerProps): ReactNode {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const isMobileNavOpen = useUIStore((state) => state.isMobileNavOpen);
    const setMobileNavOpen = useUIStore((state) => state.setMobileNavOpen);

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
            <MobilePanelDialog
                open={isMobileNavOpen}
                onOpenChange={setMobileNavOpen}
                title="Navigation"
                footer={mobilePanelFooter}
            >
                <Sidebar
                    catalog={catalog}
                    activePackageId={activePackageId}
                    activeVersionId={activeVersionId}
                    variant="mobile"
                    className={cn(SIDEBAR_BASE_CLASS, MOBILE_SIDEBAR_OVERRIDES)}
                    onSelect={() => setMobileNavOpen(false)}
                />
            </MobilePanelDialog>

            <div className={cn('flex w-full min-w-0 flex-1')}>
                <DesktopSidebarFrame
                    sidebar={
                        <Sidebar
                            catalog={catalog}
                            activePackageId={activePackageId}
                            activeVersionId={activeVersionId}
                            variant="desktop"
                            className={SIDEBAR_BASE_CLASS}
                        />
                    }
                />
                <div className={cn('flex min-h-0 min-w-0 flex-1 flex-col')}>
                    <div
                        className={cn(
                            'mx-auto w-full max-w-none min-w-0 px-3 pt-6 pb-12 md:px-7 md:pt-8 lg:px-10 lg:pt-10'
                        )}
                    >
                        {children}
                    </div>
                </div>
            </div>

            <ScrollToTopButton className={cn('fixed right-6 bottom-10')} />
        </div>
    );
}
