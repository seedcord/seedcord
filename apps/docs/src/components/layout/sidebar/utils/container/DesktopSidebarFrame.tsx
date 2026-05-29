import { cn } from '@seedcord/ui';

import type { ReactNode, ReactElement } from 'react';

function DesktopSidebarFrame({ sidebar }: { sidebar: ReactNode }): ReactElement {
    return (
        <aside
            className={cn('hidden lg:block lg:shrink-0')}
            style={{
                width: 'var(--sidebar-width)'
            }}
            aria-label="Documentation navigation"
        >
            <div
                className={cn('fixed left-0 box-border')}
                style={{
                    width: 'var(--sidebar-width)',
                    top: 'var(--nav-h)',
                    height: 'calc(100dvh - var(--nav-h))'
                }}
            >
                <div
                    className={cn(
                        'border-border/60 flex h-full flex-col overflow-hidden border-r bg-(--bg-surface-moderate-transparent)'
                    )}
                >
                    {sidebar}
                </div>
            </div>
        </aside>
    );
}

export default DesktopSidebarFrame;
