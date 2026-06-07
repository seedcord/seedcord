import { cn } from '@seedcord/ui';

import type { ReactElement } from 'react';

export function OverviewSkeleton(): ReactElement {
    return (
        <div className={cn('animate-pulse space-y-6')} aria-hidden>
            <div className={cn('space-y-4')}>
                <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between')}>
                    <div className={cn('mx-auto h-8 w-48 rounded-md bg-(--surface-moderate) lg:mx-0')} />
                    <div className={cn('h-9 w-full rounded-lg bg-(--surface-subtle) lg:w-56')} />
                </div>
                <div className={cn('h-px w-full bg-(--border)')} />
            </div>
            <div className={cn('mx-auto h-40 w-full max-w-lg rounded-md bg-(--surface-subtle)')} />
            <div className={cn('space-y-3')}>
                <div className={cn('h-4 w-2/5 rounded bg-(--surface-subtle)')} />
                <div className={cn('h-4 w-3/4 rounded bg-(--surface-subtle)')} />
                <div className={cn('h-4 w-2/3 rounded bg-(--surface-subtle)')} />
                <div className={cn('h-4 w-1/2 rounded bg-(--surface-subtle)')} />
            </div>
        </div>
    );
}
