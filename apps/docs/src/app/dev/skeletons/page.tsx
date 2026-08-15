import { cn } from '@seedcord/ui';

import { OverviewSkeleton } from '#components/docs/OverviewSkeleton';
import { SidebarCategoryListSkeleton } from '#components/layout/sidebar/SidebarCategoryListSkeleton';

import type { ReactElement, ReactNode } from 'react';

function DevSection({ title, children }: { title: string; children: ReactNode }): ReactElement {
    return (
        <section className={cn('space-y-3')}>
            <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>{title}</h2>
            {children}
        </section>
    );
}

function SkeletonsPage(): ReactElement {
    return (
        <div className={cn('space-y-10 pb-32')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>Skeletons</h1>
                <p className={cn('text-subtle text-sm')}>
                    Loading placeholders shown during navigation. They flash too fast to catch in the real app, so they
                    live here in isolation.
                </p>
            </header>
            <DevSection title="Sidebar category list (while switching package / version)">
                <div
                    className={cn(
                        'w-72 rounded-lg border border-(--border) bg-(--bg-surface-moderate-transparent) p-4'
                    )}
                >
                    <SidebarCategoryListSkeleton />
                </div>
            </DevSection>
            <DevSection title="Overview (while the overview page loads)">
                <OverviewSkeleton />
            </DevSection>
        </div>
    );
}

export default SkeletonsPage;
